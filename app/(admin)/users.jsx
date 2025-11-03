import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { collection, deleteDoc, doc, getDocs, query } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
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
import { db } from '../(auth)/firebase';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [guides, setGuides] = useState([]);
    const [userType, setUserType] = useState('customers');
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchUsers = async () => {    
        try {
            const q = query(collection(db, 'Users'));
            const querySnapshot = await getDocs(q);
            const usersData = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ id: doc.id, ...doc.data() });
            });
            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchGuides = async () => {
        try {
            const q = query(collection(db, 'guides'));
            const querySnapshot = await getDocs(q);
            const guidesData = [];
            querySnapshot.forEach((doc) => {
                guidesData.push({ id: doc.id, ...doc.data() });
            });
            setGuides(guidesData);
        } catch (error) {
            console.error('Error fetching guides:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchUsers();
            fetchGuides();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchUsers(), fetchGuides()]);
        setRefreshing(false);
    };

    const handleDeleteUser = async (userId) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this user?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'Users', userId));
                            fetchUsers();
                            Alert.alert('Success', 'User deleted successfully');
                        } catch (error) {
                            console.error('Error deleting user:', error);
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    },
                },
            ]
        );
    };

    const handleViewDetails = (item) => {
        setSelectedItem(item);
        setModalVisible(true);
    };

    const getUserName = (user) => {
        if (user.name) return user.name;
        if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
        if (user.firstName) return user.firstName;
        if (user.lastName) return user.lastName;
        return 'N/A';
    };

    const getFilteredData = () => {
        const data = userType === 'customers' ? users.filter(u => u.userType !== 'guide' && u.userType !== 'admin') : guides;
        if (!searchQuery.trim()) return data;

        return data.filter(item => {
            const searchLower = searchQuery.toLowerCase();
            const fullName = getUserName(item);
            return (
                fullName.toLowerCase().includes(searchLower) ||
                item.email?.toLowerCase().includes(searchLower) ||
                item.phone?.includes(searchQuery)
            );
        });
    };

    const renderUserItem = ({ item }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => handleViewDetails(item)}
            activeOpacity={0.7}
        >
            <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{getUserName(item)}</Text>
                    <Text style={styles.itemEmail}>{item.email}</Text>
                    {item.phone && <Text style={styles.itemPhone}>📞 {item.phone}</Text>}
                </View>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteUser(item.id)}
                >
                    <MaterialIcons name="delete" size={24} color="#F44336" />
                </TouchableOpacity>
            </View>
            {userType === 'guides' && (
                <View style={styles.guideDetails}>
                    <Text style={styles.guideDetail}>
                        <MaterialIcons name="location-on" size={14} color="#666" /> {item.location || 'N/A'}
                    </Text>
                    <Text style={styles.guideDetail}>
                        <MaterialIcons name="star" size={14} color="#FFA000" /> {item.rating || 0} ({item.totalReviews || 0} reviews)
                    </Text>
                    <Text style={styles.guideDetail}>
                        <MaterialIcons name="attach-money" size={14} color="#4CAF50" /> ৳{item.pricePerDay || 0}/day
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Users Management</Text>
                <Text style={styles.headerSubtitle}>Manage customers & guides</Text>
            </View>

            <View style={styles.controls}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, userType === 'customers' && styles.activeTab]}
                        onPress={() => setUserType('customers')}
                    >
                        <MaterialIcons 
                            name="person" 
                            size={20} 
                            color={userType === 'customers' ? '#FFFFFF' : '#666'} 
                        />
                        <Text style={[styles.tabText, userType === 'customers' && styles.activeTabText]}>
                            Customers ({users.filter(u => u.userType !== 'guide' && u.userType !== 'admin').length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, userType === 'guides' && styles.activeTab]}
                        onPress={() => setUserType('guides')}
                    >
                        <MaterialIcons 
                            name="people" 
                            size={20} 
                            color={userType === 'guides' ? '#FFFFFF' : '#666'} 
                        />
                        <Text style={[styles.tabText, userType === 'guides' && styles.activeTabText]}>
                            Guides ({guides.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    mode="outlined"
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                    left={<TextInput.Icon icon="magnify" />}
                    activeOutlineColor="#6200EE"
                />
            </View>

            <FlatList
                data={getFilteredData()}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="people-outline" size={64} color="#CCCCCC" />
                        <Text style={styles.emptyText}>No {userType} found</Text>
                        <Text style={styles.emptySubtext}>Pull down to refresh</Text>
                    </View>
                }
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {userType === 'customers' ? 'Customer' : 'Guide'} Details
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {selectedItem && (
                            <ScrollView 
                                style={styles.modalBody}
                                contentContainerStyle={styles.modalContentInner}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>NAME:</Text>
                                    <Text style={styles.detailValue}>{getUserName(selectedItem)}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>EMAIL:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.email}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>PHONE:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.phone || 'N/A'}</Text>
                                </View>

                                {userType === 'guides' && (
                                    <>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>LOCATION:</Text>
                                            <Text style={styles.detailValue}>{selectedItem.location || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>EXPERIENCE:</Text>
                                            <Text style={styles.detailValue}>{selectedItem.experience || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>LANGUAGES:</Text>
                                            <Text style={styles.detailValue}>{selectedItem.languages || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>SPECIALTIES:</Text>
                                            <Text style={styles.detailValue}>{selectedItem.specialties || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>PRICE/DAY:</Text>
                                            <Text style={styles.detailValue}>৳{selectedItem.pricePerDay || 0}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>RATING:</Text>
                                            <Text style={styles.detailValue}>
                                                {selectedItem.rating || 0} ⭐ ({selectedItem.totalReviews || 0} reviews)
                                            </Text>
                                        </View>
                                        {selectedItem.bio && (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>BIO:</Text>
                                                <Text style={styles.detailValue}>{selectedItem.bio}</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </ScrollView>
                        )}
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
    header: {
        backgroundColor: '#6200EE',
        paddingTop: 15,
        paddingBottom: 20,
        paddingHorizontal: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#E1BEE7',
    },
    controls: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#6200EE',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    searchInput: {
        backgroundColor: '#FFFFFF',
    },
    listContent: {
        padding: 16,
    },
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    itemEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    itemPhone: {
        fontSize: 14,
        color: '#666',
    },
    deleteButton: {
        padding: 8,
    },
    guideDetails: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        gap: 6,
    },
    guideDetail: {
        fontSize: 14,
        color: '#555',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        textAlign: 'center',
        color: '#BBBBBB',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: '100%',
        maxWidth: 500,
        maxHeight: '85%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F8F9FA',
        borderBottomWidth: 2,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    modalBody: {
        maxHeight: 500,
    },
    modalContentInner: {
        padding: 20,
        paddingBottom: 30,
    },
    detailRow: {
        marginBottom: 18,
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 12,
    },
    detailLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#666',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
    },
});
