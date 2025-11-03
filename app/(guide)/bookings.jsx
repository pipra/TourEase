import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../(auth)/firebase';
import { sendBookingResponseToUser } from '../../utils/realtimeNotificationService';

export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [bookingCategory, setBookingCategory] = useState('pending');
    const [refreshing, setRefreshing] = useState(false);
    // const [customerDetailsModalVisible, setCustomerDetailsModalVisible] = useState(false);
    // const [selectedBooking, setSelectedBooking] = useState(null);

    const fetchBookings = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const q = query(
                collection(db, 'bookings'),
                where('guideId', '==', currentUser.uid)
            );
            const querySnapshot = await getDocs(q);
            const bookingsData = [];
            querySnapshot.forEach((doc) => {
                bookingsData.push({ id: doc.id, ...doc.data() });
            });
            setBookings(bookingsData);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            Alert.alert('Error', 'Failed to load bookings');
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBookings();
        setRefreshing(false);
    };

    const handleShowCustomerDetails = (booking) => {
        // TODO: Implement customer details modal
        Alert.alert('Customer Details', `Name: ${booking.userName}\nEmail: ${booking.userEmail}\nGuests: ${booking.guests}`);
        // setSelectedBooking(booking);
        // setCustomerDetailsModalVisible(true);
    };

    // const handleCloseCustomerDetails = () => {
    //     setCustomerDetailsModalVisible(false);
    //     setSelectedBooking(null);
    // };

    const handleBookingStatusUpdate = async (bookingId, newStatus) => {
        try {
            const bookingRef = doc(db, 'bookings', bookingId);
            await updateDoc(bookingRef, { status: newStatus });

            // Send notification to user
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) {
                await sendBookingResponseToUser(booking.userId, {
                    bookingId,
                    status: newStatus,
                    guideName: booking.guideName || 'Guide',
                    location: booking.location,
                    dates: Array.isArray(booking.dates) ? booking.dates.join(', ') : booking.date,
                    totalPrice: booking.totalPrice
                });
            }

            Alert.alert('Success', `Booking ${newStatus === 'confirmed' ? 'confirmed' : 'cancelled'} successfully`);
            await fetchBookings();
        } catch (error) {
            console.error('Error updating booking:', error);
            Alert.alert('Error', 'Failed to update booking status');
        }
    };
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#FFA500';
            case 'confirmed': return '#4CAF50';
            case 'cancelled': return '#F44336';
            default: return '#999';
        }
    };

    const getFilteredBookings = () => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        
        return bookings.filter(booking => {
            // Handle both single date and multiple dates
            let isPastDate = false;
            
            if (Array.isArray(booking.dates) && booking.dates.length > 0) {
                // For multiple dates, consider expired if all dates are past
                isPastDate = booking.dates.every(date => date < currentDate);
            } else if (booking.date) {
                isPastDate = booking.date < currentDate;
            }
            
            switch(bookingCategory) {
                case 'pending':
                    return booking.status === 'pending'; // Show all pending regardless of date
                case 'accepted':
                    return booking.status === 'confirmed' && !isPastDate;
                case 'cancelled':
                    return booking.status === 'cancelled';
                case 'history':
                    return (booking.status === 'confirmed' && isPastDate);
                default:
                    return false;
            }
        });
    };

    const renderBookingItem = ({ item }) => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        
        // Handle both single date and multiple dates
        let bookingDate = item.date;
        let isPastDate = false;
        
        if (Array.isArray(item.dates) && item.dates.length > 0) {
            // For multiple dates, use the earliest date to determine if expired
            bookingDate = item.dates[0];
            isPastDate = item.dates.every(date => date < currentDate);
        } else if (item.date) {
            isPastDate = bookingDate < currentDate;
        }
        
        return (
            <TouchableOpacity 
                style={[
                    styles.bookingCard,
                    isPastDate && item.status === 'pending' && styles.expiredBookingCard
                ]}
                onPress={() => handleShowCustomerDetails(item)}
                activeOpacity={0.7}
            >
                <View style={styles.bookingHeader}>
                    <Text style={styles.bookingTitle}>{item.userName}</Text>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                        </View>
                        {isPastDate && item.status === 'pending' && (
                            <View style={styles.expiredBadge}>
                                <Text style={styles.expiredText}>EXPIRED</Text>
                            </View>
                        )}
                    </View>
                </View>
                
                <Text style={[
                    styles.bookingDetail,
                    isPastDate && item.status === 'pending' && styles.expiredText
                ]}>
                    <MaterialIcons name="event" size={16} color="#666" /> {(() => {
                        if (Array.isArray(item.dates) && item.dates.length > 0) {
                            return item.dates.join(', ');
                        } else if (item.date) {
                            return item.date;
                        } else {
                            return 'No date specified';
                        }
                    })()} {isPastDate && item.status === 'pending' && '(Past Date)'}
                </Text>
                <Text style={styles.bookingDetail}>
                    <MaterialIcons name="people" size={16} color="#666" /> {item.guests} guests
                </Text>
                <Text style={styles.bookingDetail}>
                    <MaterialIcons name="attach-money" size={16} color="#666" /> ৳{item.totalPrice}
                </Text>
                <Text style={styles.bookingDetail}>
                    <MaterialIcons name="email" size={16} color="#666" /> {item.userEmail}
                </Text>
                
                {item.status === 'pending' && (
                    <View style={styles.bookingActions}>
                        <TouchableOpacity
                            style={[
                                styles.actionButton, 
                                styles.confirmButton,
                                isPastDate && styles.disabledButton
                            ]}
                            onPress={(e) => {
                                e.stopPropagation();
                                if (!isPastDate) {
                                    handleBookingStatusUpdate(item.id, 'confirmed');
                                }
                            }}
                            disabled={isPastDate}
                        >
                            <Text style={[
                                styles.actionButtonText,
                                isPastDate && styles.disabledButtonText
                            ]}>
                                {isPastDate ? 'Expired' : 'Confirm'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleBookingStatusUpdate(item.id, 'cancelled');
                            }}
                        >
                            <Text style={styles.actionButtonText}>
                                {isPastDate ? 'Remove' : 'Reject'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <Text style={styles.headerSubtitle}>Manage your tour bookings</Text>
            </View>

            {/* Category Filter Buttons */}
            <View style={styles.categoryContainer}>
                {[
                    { key: 'pending', label: 'Pending', icon: 'schedule' },
                    { key: 'accepted', label: 'Accepted', icon: 'check-circle' },
                    { key: 'cancelled', label: 'Cancelled', icon: 'cancel' },
                    { key: 'history', label: 'History', icon: 'history' }
                ].map((category) => {
                    const now = new Date();
                    const currentDate = now.toISOString().split('T')[0];
                    
                    const count = bookings.filter(booking => {
                        // Handle both single date and multiple dates
                        let isPastDate = false;
                        
                        if (Array.isArray(booking.dates) && booking.dates.length > 0) {
                            // For multiple dates, consider expired if all dates are past
                            isPastDate = booking.dates.every(date => date < currentDate);
                        } else if (booking.date) {
                            isPastDate = booking.date < currentDate;
                        }
                        
                        switch(category.key) {
                            case 'pending':
                                return booking.status === 'pending'; // Show all pending regardless of date
                            case 'accepted':
                                return booking.status === 'confirmed' && !isPastDate;
                            case 'cancelled':
                                return booking.status === 'cancelled';
                            case 'history':
                                return (booking.status === 'confirmed' && isPastDate);
                            default:
                                return false;
                        }
                    }).length;

                    return (
                        <TouchableOpacity
                            key={category.key}
                            style={[
                                styles.categoryButton,
                                bookingCategory === category.key && styles.activeCategoryButton
                            ]}
                            onPress={() => setBookingCategory(category.key)}
                        >
                            <MaterialIcons 
                                name={category.icon} 
                                size={24} 
                                color={bookingCategory === category.key ? '#FFFFFF' : '#666'} 
                            />
                            <Text style={[
                                styles.categoryButtonText,
                                bookingCategory === category.key && styles.activeCategoryButtonText
                            ]}>
                                {category.label}
                            </Text>
                            <View style={[
                                styles.categoryCount,
                                bookingCategory === category.key && styles.activeCategoryCount
                            ]}>
                                <Text style={[
                                    styles.categoryCountText,
                                    bookingCategory === category.key && styles.activeCategoryCountText
                                ]}>
                                    {count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Bookings List */}
            <FlatList
                data={getFilteredBookings()}
                renderItem={renderBookingItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.bookingsList}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="event-busy" size={64} color="#CCCCCC" />
                        <Text style={styles.emptyText}>No {bookingCategory} bookings</Text>
                        <Text style={styles.emptySubtext}>Pull down to refresh</Text>
                    </View>
                }
            />
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
        marginTop: 45,
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
    bookingsContainer: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    categoryContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    categoryButton: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 6,
        marginHorizontal: 4,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    activeCategoryButton: {
        backgroundColor: '#6200EE',
        borderColor: '#6200EE',
        elevation: 4,
        shadowColor: '#6200EE',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        transform: [{ scale: 1.02 }],
    },
    categoryButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#666',
        marginTop: 6,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activeCategoryButtonText: {
        color: '#FFFFFF',
    },
    categoryCount: {
        backgroundColor: '#E0E0E0',
        borderRadius: 14,
        paddingVertical: 3,
        paddingHorizontal: 10,
        minWidth: 28,
        marginTop: 4,
    },
    activeCategoryCount: {
        backgroundColor: '#FFFFFF',
    },
    categoryCountText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        textAlign: 'center',
    },
    activeCategoryCountText: {
        color: '#6200EE',
    },
    bookingsList: {
        padding: 16,
    },
    bookingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 5,
        borderLeftWidth: 5,
        borderLeftColor: '#6200EE',
    },
    expiredBookingCard: {
        borderLeftColor: '#F44336',
        backgroundColor: '#FFFAFA',
        opacity: 0.95,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    bookingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        flex: 1,
        letterSpacing: 0.3,
    },
    statusContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.8,
    },
    expiredBadge: {
        backgroundColor: '#F44336',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        elevation: 2,
    },
    expiredText: {
        color: '#F44336',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    bookingDetail: {
        fontSize: 15,
        color: '#555',
        marginBottom: 10,
        lineHeight: 22,
        flexDirection: 'row',
        alignItems: 'center',
    },
    bookingActions: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    confirmButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#F44336',
    },
    disabledButton: {
        backgroundColor: '#BDBDBD',
        elevation: 0,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.5,
    },
    disabledButtonText: {
        color: '#757575',
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
});
