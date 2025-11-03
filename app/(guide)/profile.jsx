import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../(auth)/firebase';

export default function Profile() {
    const [guideData, setGuideData] = useState(null);
    const [stats, setStats] = useState({
        totalBookings: 0,
        confirmedBookings: 0,
        totalEarnings: 0,
    });
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({});

    const fetchGuideData = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const guideDoc = await getDoc(doc(db, 'guides', currentUser.uid));
            if (guideDoc.exists()) {
                const data = guideDoc.data();
                setGuideData(data);
                setEditForm({
                    bio: data.bio || '',
                    languages: data.languages || '',
                    specialties: data.specialties || '',
                    pricePerDay: data.pricePerDay || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching guide data:', error);
        }
    };

    const calculateStats = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const q = query(
                collection(db, 'bookings'),
                where('guideId', '==', currentUser.uid)
            );
            const querySnapshot = await getDocs(q);
            
            let total = 0;
            let confirmed = 0;
            let earnings = 0;

            const now = new Date();
            const currentDate = now.toISOString().split('T')[0];

            querySnapshot.forEach((doc) => {
                const booking = doc.data();
                total++;
                
                if (booking.status === 'confirmed') {
                    let isPastDate = false;
                    if (Array.isArray(booking.dates) && booking.dates.length > 0) {
                        isPastDate = booking.dates.every(date => date < currentDate);
                    } else if (booking.date) {
                        isPastDate = booking.date < currentDate;
                    }
                    
                    if (!isPastDate) {
                        confirmed++;
                    }
                    
                    if (booking.totalPrice) {
                        earnings += parseFloat(booking.totalPrice);
                    }
                }
            });

            setStats({
                totalBookings: total,
                confirmedBookings: confirmed,
                totalEarnings: earnings,
            });
        } catch (error) {
            console.error('Error calculating stats:', error);
        }
    };

    const fetchData = useCallback(async () => {
        await Promise.all([fetchGuideData(), calculateStats()]);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [fetchData]);

    const handleProfileUpdate = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            await updateDoc(doc(db, 'guides', currentUser.uid), {
                bio: editForm.bio,
                languages: editForm.languages,
                specialties: editForm.specialties,
                pricePerDay: editForm.pricePerDay,
            });

            Alert.alert('Success', 'Profile updated successfully');
            setEditModalVisible(false);
            await fetchGuideData();
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut(auth);
                            router.replace('/');
                        } catch (error) {
                            console.error('Error signing out:', error);
                            Alert.alert('Error', 'Failed to sign out');
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                style={styles.profileContainer} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
            {guideData && (
                <>
                    {/* Profile Header Card */}
                    <View style={styles.profileHeaderCard}>
                        <View style={styles.profileImageContainer}>
                            <Image source={{ uri: guideData.image }} style={styles.profileImage} />
                        </View>
                        
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{guideData.name}</Text>
                            <View style={styles.locationRow}>
                                <Text style={styles.locationIcon}>📍</Text>
                                <Text style={styles.profileLocation}>{guideData.location}</Text>
                            </View>
                            
                            <View style={styles.profileStats}>
                                <View style={styles.statItem}>
                                    <View style={styles.ratingBadge}>
                                        <Text style={styles.ratingText}>⭐ {guideData.rating || 0}</Text>
                                    </View>
                                    <Text style={styles.statLabel}>{guideData.reviews || 0} reviews</Text>
                                </View>
                                
                                <View style={styles.statDivider}></View>
                                
                                <View style={styles.statItem}>
                                    <Text style={styles.experienceNumber}>{guideData.experience}</Text>
                                    <Text style={styles.statLabel}>Years Experience</Text>
                                </View>
                                
                                <View style={styles.statDivider}></View>
                                
                                <View style={styles.statItem}>
                                    <Text style={styles.priceNumber}>৳{guideData.pricePerDay}</Text>
                                    <Text style={styles.statLabel}>Per Day</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Quick Stats Cards */}
                    <View style={styles.quickStatsRow}>
                        <View style={styles.quickStatCard}>
                            <Text style={styles.quickStatNumber}>{stats.totalBookings}</Text>
                            <Text style={styles.quickStatLabel}>Total Bookings</Text>
                        </View>
                        <View style={styles.quickStatCard}>
                            <Text style={styles.quickStatNumber}>{stats.confirmedBookings}</Text>
                            <Text style={styles.quickStatLabel}>Confirmed</Text>
                        </View>
                        <View style={styles.quickStatCard}>
                            <Text style={styles.quickStatNumber}>৳{stats.totalEarnings}</Text>
                            <Text style={styles.quickStatLabel}>Earnings</Text>
                        </View>
                    </View>

                    {/* Profile Details Cards */}
                    <View style={styles.detailsSection}>
                        <View style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailIcon}>🌐</Text>
                                <Text style={styles.detailTitle}>Languages</Text>
                            </View>
                            <Text style={styles.detailContent}>{guideData.languages}</Text>
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailIcon}>⭐</Text>
                                <Text style={styles.detailTitle}>Specialties</Text>
                            </View>
                            <Text style={styles.detailContent}>{guideData.specialties}</Text>
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailIcon}>📝</Text>
                                <Text style={styles.detailTitle}>About Me</Text>
                            </View>
                            <Text style={styles.detailContent}>{guideData.bio}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setEditModalVisible(true)}
                    >
                        <Text style={styles.editButtonIcon}>✏️</Text>
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleLogout}
                    >
                        <MaterialIcons name="logout" size={20} color="#fff" />
                        <Text style={styles.signOutButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal
            visible={editModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setEditModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Edit Profile</Text>
                    
                    <TextInput
                        label="Bio"
                        value={editForm.bio}
                        onChangeText={(text) => setEditForm({ ...editForm, bio: text })}
                        style={styles.input}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        left={<TextInput.Icon icon="text" />}
                    />
                    
                    <TextInput
                        label="Languages"
                        value={editForm.languages}
                        onChangeText={(text) => setEditForm({ ...editForm, languages: text })}
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="translate" />}
                    />
                    
                    <TextInput
                        label="Specialties"
                        value={editForm.specialties}
                        onChangeText={(text) => setEditForm({ ...editForm, specialties: text })}
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="star" />}
                    />
                    
                    <TextInput
                        label="Daily Rate"
                        value={editForm.pricePerDay?.toString()}
                        onChangeText={(text) => setEditForm({ ...editForm, pricePerDay: parseInt(text) || 0 })}
                        keyboardType="numeric"
                        style={styles.input}
                        mode="outlined"
                        left={<TextInput.Icon icon="currency-bdt" />}
                    />

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => setEditModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.saveButton]}
                            onPress={handleProfileUpdate}
                        >
                            <Text style={styles.modalButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    profileContainer: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    profileHeaderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        margin: 15,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#6200EE',
    },
    profileInfo: {
        alignItems: 'center',
    },
    profileName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    locationIcon: {
        fontSize: 18,
        marginRight: 6,
    },
    profileLocation: {
        fontSize: 16,
        color: '#666',
    },
    profileStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    statItem: {
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E0E0E0',
    },
    ratingBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 6,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F57C00',
    },
    experienceNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6200EE',
        marginBottom: 4,
    },
    priceNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
    },
    quickStatsRow: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        gap: 10,
        marginBottom: 15,
    },
    quickStatCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    quickStatNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#6200EE',
        marginBottom: 4,
    },
    quickStatLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    detailsSection: {
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    detailCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailIcon: {
        fontSize: 24,
        marginRight: 10,
    },
    detailTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    detailContent: {
        fontSize: 16,
        color: '#555',
        lineHeight: 24,
    },
    editButton: {
        backgroundColor: '#6200EE',
        borderRadius: 15,
        paddingVertical: 15,
        paddingHorizontal: 20,
        margin: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#6200EE',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    editButtonIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    signOutButton: {
        flexDirection: 'row',
        backgroundColor: '#FF5252',
        borderRadius: 15,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#FF5252',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    signOutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 25,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        marginBottom: 15,
        backgroundColor: 'white',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#F44336',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
