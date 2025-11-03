import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../(auth)/firebase';

export default function Overview() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalGuides: 0,
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        pendingGuideApplications: 0,
        verifiedPendingApplications: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const [
                usersSnap,
                guidesSnap,
                bookingsSnap,
                pendingSnap,
                confirmedSnap,
                pendingApplicationsSnap,
                verifiedPendingApplicationsSnap
            ] = await Promise.all([
                getCountFromServer(collection(db, 'Users')),
                getCountFromServer(collection(db, 'guides')),
                getCountFromServer(collection(db, 'bookings')),
                getCountFromServer(query(collection(db, 'bookings'), where('status', '==', 'pending'))),
                getCountFromServer(query(collection(db, 'bookings'), where('status', '==', 'confirmed'))),
                getCountFromServer(query(collection(db, 'guide-applications'), where('status', '==', 'pending'))),
                getCountFromServer(query(collection(db, 'guide-applications'), where('status', '==', 'pending'), where('emailVerified', '==', true))),
            ]);

            setStats({
                totalUsers: usersSnap.data().count,
                totalGuides: guidesSnap.data().count,
                totalBookings: bookingsSnap.data().count,
                pendingBookings: pendingSnap.data().count,
                confirmedBookings: confirmedSnap.data().count,
                pendingGuideApplications: pendingApplicationsSnap.data().count,
                verifiedPendingApplications: verifiedPendingApplicationsSnap.data().count,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
    };

    const StatCard = ({ icon, title, value, color, iconBg }) => (
        <View style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                <MaterialIcons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            <View style={[styles.colorBar, { backgroundColor: color }]} />
        </View>
    );

    const handleSignOut = () => {
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
                            await auth.signOut();
                            router.replace('/(auth)/login');
                        } catch (_error) {
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Admin Dashboard</Text>
                    <Text style={styles.headerSubtitle}>System Overview</Text>
                </View>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <MaterialIcons name="logout" size={24} color="#FFFFFF" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} />
                }
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>User Statistics</Text>
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon="person"
                            title="Total Users"
                            value={stats.totalUsers}
                            color="#2196F3"
                            iconBg="#E3F2FD"
                        />
                        <StatCard
                            icon="people"
                            title="Total Guides"
                            value={stats.totalGuides}
                            color="#4CAF50"
                            iconBg="#E8F5E9"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Booking Statistics</Text>
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon="event-note"
                            title="Total Bookings"
                            value={stats.totalBookings}
                            color="#9C27B0"
                            iconBg="#F3E5F5"
                        />
                        <StatCard
                            icon="schedule"
                            title="Pending Bookings"
                            value={stats.pendingBookings}
                            color="#FF9800"
                            iconBg="#FFF3E0"
                        />
                        <StatCard
                            icon="check-circle"
                            title="Confirmed Bookings"
                            value={stats.confirmedBookings}
                            color="#4CAF50"
                            iconBg="#E8F5E9"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Guide Applications</Text>
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon="assignment"
                            title="Pending Applications"
                            value={stats.pendingGuideApplications}
                            color="#F44336"
                            iconBg="#FFEBEE"
                        />
                        <StatCard
                            icon="verified"
                            title="Verified & Pending"
                            value={stats.verifiedPendingApplications}
                            color="#00BCD4"
                            iconBg="#E0F7FA"
                        />
                    </View>
                </View>
            </ScrollView>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
    },
    signOutText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        paddingLeft: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        width: '48%',
        minHeight: 140,
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
        textAlign: 'center',
    },
    statTitle: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
        textAlign: 'center',
    },
    colorBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
    },
});
