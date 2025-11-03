import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
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

export default function Applications() {
    const [guideApplications, setGuideApplications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [statusFilter, setStatusFilter] = useState('pending');

    const fetchGuideApplications = async () => {
        try {
            const q = query(collection(db, 'guide-applications'), orderBy('appliedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const applicationsData = [];
            querySnapshot.forEach((doc) => {
                applicationsData.push({ id: doc.id, ...doc.data() });
            });
            setGuideApplications(applicationsData);
        } catch (error) {
            console.error('Error fetching applications:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchGuideApplications();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchGuideApplications();
        setRefreshing(false);
    };

    const handleApproveGuideApplication = async (applicationId, applicationData) => {
        Alert.alert(
            'Approve Guide Application',
            'Are you sure you want to approve this guide application?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            // Move application to guides collection
                            await setDoc(doc(db, 'guides', applicationId), {
                                ...applicationData,
                                status: 'approved',
                                approvedAt: new Date(),
                            });

                            // Update application status
                            await updateDoc(doc(db, 'guide-applications', applicationId), {
                                status: 'approved',
                                approvedAt: new Date(),
                            });

                            // Update Users collection to allow login
                            await updateDoc(doc(db, 'Users', applicationId), {
                                canLogin: true,
                                approvedAt: new Date(),
                            });

                            fetchGuideApplications();
                            setModalVisible(false);
                            Alert.alert('Success', 'Guide application approved successfully. The guide can now login.');
                        } catch (error) {
                            console.error('Error approving guide:', error);
                            Alert.alert('Error', 'Failed to approve guide application');
                        }
                    },
                },
            ]
        );
    };

    const handleRejectGuideApplication = async (applicationId) => {
        Alert.alert(
            'Reject Guide Application',
            'Are you sure you want to reject this guide application?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, 'guide-applications', applicationId), {
                                status: 'rejected',
                                rejectedAt: new Date(),
                            });

                            fetchGuideApplications();
                            setModalVisible(false);
                            Alert.alert('Success', 'Guide application rejected');
                        } catch (error) {
                            console.error('Error rejecting application:', error);
                            Alert.alert('Error', 'Failed to reject guide application');
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

    const getFilteredApplications = () => {
        let filtered = guideApplications.filter(app => app.status === statusFilter);

        if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase();
            filtered = filtered.filter(app =>
                app.name?.toLowerCase().includes(searchLower) ||
                app.email?.toLowerCase().includes(searchLower) ||
                app.phone?.includes(searchQuery) ||
                app.location?.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#FF9800';
            case 'approved': return '#4CAF50';
            case 'rejected': return '#F44336';
            default: return '#999';
        }
    };

    const renderApplicationItem = ({ item }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => handleViewDetails(item)}
            activeOpacity={0.7}
        >
            <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name || 'N/A'}</Text>
                    <Text style={styles.itemEmail}>{item.email}</Text>
                    {item.phone && <Text style={styles.itemPhone}>📞 {item.phone}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.applicationDetails}>
                <Text style={styles.detailText}>
                    <MaterialIcons name="location-on" size={14} color="#666" /> {item.location || 'N/A'}
                </Text>
                <Text style={styles.detailText}>
                    <MaterialIcons name="work" size={14} color="#666" /> {item.experience || 'N/A'}
                </Text>
                <Text style={styles.detailText}>
                    <MaterialIcons name="translate" size={14} color="#666" /> {item.languages || 'N/A'}
                </Text>
                {item.emailVerified && (
                    <View style={styles.verifiedBadge}>
                        <MaterialIcons name="verified" size={16} color="#4CAF50" />
                        <Text style={styles.verifiedText}>Email Verified</Text>
                    </View>
                )}
            </View>

            <Text style={styles.dateText}>
                Applied: {item.appliedAt ? new Date(item.appliedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Guide Applications</Text>
                <Text style={styles.headerSubtitle}>Review & manage applications</Text>
            </View>

            <View style={styles.controls}>
                <View style={styles.filterContainer}>
                    {['pending', 'approved', 'rejected'].map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.filterButton,
                                statusFilter === status && styles.activeFilterButton,
                                { borderColor: getStatusColor(status) }
                            ]}
                            onPress={() => setStatusFilter(status)}
                        >
                            <Text style={[
                                styles.filterText,
                                statusFilter === status && { color: getStatusColor(status) }
                            ]}>
                                {status.charAt(0).toUpperCase() + status.slice(1)} 
                                ({guideApplications.filter(app => app.status === status).length})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TextInput
                    mode="outlined"
                    placeholder="Search applications..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                    left={<TextInput.Icon icon="magnify" />}
                    activeOutlineColor="#6200EE"
                />
            </View>

            <FlatList
                data={getFilteredApplications()}
                renderItem={renderApplicationItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="assignment" size={64} color="#CCCCCC" />
                        <Text style={styles.emptyText}>No {statusFilter} applications</Text>
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
                            <Text style={styles.modalTitle}>Application Details</Text>
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
                                    <Text style={styles.detailLabel}>Name:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.name || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Email:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.email}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Phone:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.phone || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Location:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.location || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Experience:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.experience || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Languages:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.languages || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Specialties:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.specialties || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Price/Day:</Text>
                                    <Text style={styles.detailValue}>৳{selectedItem.pricePerDay || 0}</Text>
                                </View>
                                {selectedItem.bio && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Bio:</Text>
                                        <Text style={styles.detailValue}>{selectedItem.bio}</Text>
                                    </View>
                                )}
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Email Verified:</Text>
                                    <Text style={styles.detailValue}>{selectedItem.emailVerified ? 'Yes ✓' : 'No ✗'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Applied At:</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedItem.appliedAt ? new Date(selectedItem.appliedAt.seconds * 1000).toLocaleString() : 'N/A'}
                                    </Text>
                                </View>

                                {selectedItem.status === 'pending' && (
                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.approveButton]}
                                            onPress={() => handleApproveGuideApplication(selectedItem.id, selectedItem)}
                                        >
                                            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                                            <Text style={styles.actionButtonText}>Approve</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.rejectButton]}
                                            onPress={() => handleRejectGuideApplication(selectedItem.id)}
                                        >
                                            <MaterialIcons name="cancel" size={20} color="#FFFFFF" />
                                            <Text style={styles.actionButtonText}>Reject</Text>
                                        </TouchableOpacity>
                                    </View>
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
    filterContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 2,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
    },
    activeFilterButton: {
        backgroundColor: '#FFFFFF',
    },
    filterText: {
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
    applicationDetails: {
        marginBottom: 8,
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        color: '#555',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    verifiedText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '600',
    },
    dateText: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
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
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 28,
        paddingTop: 20,
        borderTopWidth: 2,
        borderTopColor: '#E0E0E0',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#F44336',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
