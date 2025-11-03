import { useFocusEffect } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../(auth)/firebase';

export default function Statistics() {
    const [stats, setStats] = useState({
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        totalEarnings: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

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
            let pending = 0;
            let confirmed = 0;
            let earnings = 0;

            const now = new Date();
            const currentDate = now.toISOString().split('T')[0];

            querySnapshot.forEach((doc) => {
                const booking = doc.data();
                total++;
                
                if (booking.status === 'pending') {
                    pending++;
                } else if (booking.status === 'confirmed') {
                    // Check if booking is not in the past
                    let isPastDate = false;
                    if (Array.isArray(booking.dates) && booking.dates.length > 0) {
                        isPastDate = booking.dates.every(date => date < currentDate);
                    } else if (booking.date) {
                        isPastDate = booking.date < currentDate;
                    }
                    
                    if (!isPastDate) {
                        confirmed++;
                    }
                    
                    // Add to earnings if confirmed (regardless of date)
                    if (booking.totalPrice) {
                        earnings += parseFloat(booking.totalPrice);
                    }
                }
            });

            setStats({
                totalBookings: total,
                pendingBookings: pending,
                confirmedBookings: confirmed,
                totalEarnings: earnings,
            });
        } catch (error) {
            console.error('Error calculating stats:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            calculateStats();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await calculateStats();
        setRefreshing(false);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                style={styles.statsContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.headerTitle}>Statistics</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.totalBookings}</Text>
                        <Text style={styles.statLabel}>Total Bookings</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.pendingBookings}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.confirmedBookings}</Text>
                        <Text style={styles.statLabel}>Confirmed</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>৳{stats.totalEarnings}</Text>
                        <Text style={styles.statLabel}>Total Earnings</Text>
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
    statsContainer: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        padding: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '48%',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#6200EE',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});
