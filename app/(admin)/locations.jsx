import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
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

export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [viewType, setViewType] = useState('bookings');
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchBookings = async () => {
        try {
            const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const bookingsData = [];
            querySnapshot.forEach((doc) => {
                bookingsData.push({ id: doc.id, ...doc.data() });
            });
            setBookings(bookingsData);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const fetchReviews = async () => {
        try {
            const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const reviewsData = [];
            querySnapshot.forEach((doc) => {
                reviewsData.push({ id: doc.id, ...doc.data() });
            });
            setReviews(reviewsData);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
            fetchReviews();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchBookings(), fetchReviews()]);
        setRefreshing(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#FF9800';
            case 'confirmed': return '#4CAF50';
            case 'cancelled': return '#F44336';
            default: return '#666';
        }
    };

    const getFilteredBookings = () => {
        let filtered = statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter);

        if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase();
            filtered = filtered.filter(booking =>
                booking.userName?.toLowerCase().includes(searchLower) ||
                booking.guideName?.toLowerCase().includes(searchLower) ||
                booking.guideLocation?.toLowerCase().includes(searchLower) ||
                booking.userEmail?.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    };

    const getFilteredReviews = () => {
        if (!searchQuery.trim()) return reviews;

        const searchLower = searchQuery.toLowerCase();
        return reviews.filter(review =>
            review.userName?.toLowerCase().includes(searchLower) ||
            review.guideName?.toLowerCase().includes(searchLower) ||
            review.review?.toLowerCase().includes(searchLower)
        );
    };

    const renderBookingItem = ({ item }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => {
                setSelectedItem(item);
                setModalVisible(true);
            }}
            activeOpacity={0.7}
        >
            <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.userName} → {item.guideName}</Text>
                    <Text style={styles.itemEmail}>
                        <MaterialIcons name="email" size={14} color="#666" /> {item.userEmail}
                    </Text>
                    <Text style={styles.itemLocation}>
                        <MaterialIcons name="location-on" size={14} color="#666" /> {item.guideLocation || 'N/A'}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.bookingDetails}>
                <Text style={styles.detailText}>
                    <MaterialIcons name="event" size={14} color="#666" /> {item.date || item.dates?.join(', ') || 'N/A'}
                </Text>
                <Text style={styles.detailText}>
                    <MaterialIcons name="people" size={14} color="#666" /> {item.guests || 1} guests
                </Text>
                <Text style={styles.detailText}>
                    <MaterialIcons name="attach-money" size={14} color="#666" /> ৳{item.totalPrice || item.price || 0}
                </Text>
            </View>

            <Text style={styles.dateText}>
                Booked: {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
            </Text>
        </TouchableOpacity>
    );

    const renderReviewItem = ({ item }) => (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{item.userName || 'Anonymous'}</Text>
                    <Text style={styles.guideName}>for {item.guideName || 'Guide'}</Text>
                </View>
                <View style={styles.ratingContainer}>
                    <MaterialIcons name="star" size={20} color="#FFA000" />
                    <Text style={styles.ratingText}>{item.rating || 0}/5</Text>
                </View>
            </View>

            <Text style={styles.reviewText}>{item.review || 'No review text'}</Text>

            <Text style={styles.reviewDate}>
                {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Bookings & Reviews</Text>
                <Text style={styles.headerSubtitle}>Monitor all transactions</Text>
            </View>

            <View style={styles.controls}>
                <View style={styles.viewTypeContainer}>
                    <TouchableOpacity
                        style={[styles.viewTypeButton, viewType === 'bookings' && styles.activeViewType]}
                        onPress={() => setViewType('bookings')}
                    >
                        <MaterialIcons 
                            name="event-note" 
                            size={20} 
                            color={viewType === 'bookings' ? '#FFFFFF' : '#666'} 
                        />
                        <Text style={[styles.viewTypeText, viewType === 'bookings' && styles.activeViewTypeText]}>
                            Bookings ({bookings.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.viewTypeButton, viewType === 'reviews' && styles.activeViewType]}
                        onPress={() => setViewType('reviews')}
                    >
                        <MaterialIcons 
                            name="star" 
                            size={20} 
                            color={viewType === 'reviews' ? '#FFFFFF' : '#666'} 
                        />
                        <Text style={[styles.viewTypeText, viewType === 'reviews' && styles.activeViewTypeText]}>
                            Reviews ({reviews.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {viewType === 'bookings' && (
                    <View style={styles.filterContainer}>
                        {['all', 'pending', 'confirmed', 'cancelled'].map((status) => (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.filterChip,
                                    statusFilter === status && styles.activeFilterChip,
                                    { borderColor: status === 'all' ? '#6200EE' : getStatusColor(status) }
                                ]}
                                onPress={() => setStatusFilter(status)}
                            >
                                <Text style={[
                                    styles.filterChipText,
                                    statusFilter === status && { 
                                        color: status === 'all' ? '#6200EE' : getStatusColor(status) 
                                    }
                                ]}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <TextInput
                    mode="outlined"
                    placeholder={`Search ${viewType}...`}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                    left={<TextInput.Icon icon="magnify" />}
                    activeOutlineColor="#6200EE"
                />
            </View>

            <FlatList
                data={viewType === 'bookings' ? getFilteredBookings() : getFilteredReviews()}
                renderItem={viewType === 'bookings' ? renderBookingItem : renderReviewItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons 
                            name={viewType === 'bookings' ? 'event-busy' : 'star-border'} 
                            size={64} 
                            color="#CCCCCC" 
                        />
                        <Text style={styles.emptyText}>No {viewType} found</Text>
                        <Text style={styles.emptySubtext}>Pull down to refresh</Text>
                    </View>
                }
            />

            {/* Booking Details Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Booking Details</Text>
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
                                <View style={[styles.statusBadge, { 
                                    backgroundColor: getStatusColor(selectedItem.status),
                                    alignSelf: 'flex-start',
                                    marginBottom: 20
                                }]}>
                                    <Text style={styles.statusText}>{selectedItem.status?.toUpperCase()}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>CUSTOMER NAME:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.userName || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>CUSTOMER EMAIL:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.userEmail || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>GUIDE NAME:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.guideName || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>LOCATION:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.guideLocation || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>DATE(S):</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedItem.date || selectedItem.dates?.join(', ') || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>GUESTS:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.guests || 1}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>TOTAL PRICE:</Text>
                                    <Text style={styles.detailValue}>৳{selectedItem.totalPrice || selectedItem.price || 0}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>BOOKED AT:</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedItem.createdAt 
                                            ? new Date(selectedItem.createdAt.seconds * 1000).toLocaleString() 
                                            : 'N/A'}
                                    </Text>
                                </View>
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
    viewTypeContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    viewTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    activeViewType: {
        backgroundColor: '#6200EE',
    },
    viewTypeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    activeViewTypeText: {
        color: '#FFFFFF',
    },
    filterContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
        flexWrap: 'wrap',
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 2,
        backgroundColor: '#F5F5F5',
    },
    activeFilterChip: {
        backgroundColor: '#FFFFFF',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
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
        marginBottom: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
    },
    itemEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    itemLocation: {
        fontSize: 14,
        color: '#666',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    bookingDetails: {
        marginBottom: 8,
        gap: 6,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    detailText: {
        fontSize: 14,
        color: '#555',
    },
    dateText: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
    },
    reviewCard: {
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
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    reviewerInfo: {
        flex: 1,
    },
    reviewerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    guideName: {
        fontSize: 14,
        color: '#666',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFA000',
    },
    reviewText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 8,
    },
    reviewDate: {
        fontSize: 12,
        color: '#999',
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
