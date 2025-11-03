import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    setDoc,
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

export default function Locations() {
    const [locations, setLocations] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [locationForm, setLocationForm] = useState({
        name: '',
        placeName: '',
        description: '',
        category: '',
        attractions: '',
        bestTimeToVisit: '',
        averageTemperature: '',
        language: '',
        currency: '',
        image: '',
    });

    const fetchLocations = async () => {
        try {
            const q = query(collection(db, 'locations'), orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            const firebaseLocations = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const transformedLocation = {
                    id: doc.id,
                    name: data.name || '',
                    placeName: data.placeName || '',
                    description: data.description || '',
                    category: data.category || 'Other',
                    attractions: Array.isArray(data.attractions) ? data.attractions : 
                               (data.attractions ? data.attractions.split(',').map(s => s.trim()) : []),
                    bestTimeToVisit: data.bestTimeToVisit || 'Year round',
                    averageTemperature: data.averageTemperature || 'N/A',
                    language: data.language || 'Local',
                    currency: data.currency || 'Local currency',
                    image: data.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
                    rating: data.rating || 0,
                    reviews: data.reviews || 0,
                    isDefault: false,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                };
                firebaseLocations.push(transformedLocation);
            });

            setLocations(firebaseLocations);
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchLocations();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchLocations();
        setRefreshing(false);
    };

    const handleAddLocation = async () => {
        try {
            if (!locationForm.name.trim()) {
                Alert.alert('Error', 'Location name is required');
                return;
            }

            await setDoc(doc(collection(db, 'locations')), {
                ...locationForm,
                rating: 0,
                reviews: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            setLocationForm({
                name: '',
                placeName: '',
                description: '',
                category: '',
                attractions: '',
                bestTimeToVisit: '',
                averageTemperature: '',
                language: '',
                currency: '',
                image: '',
            });

            fetchLocations();
            setAddModalVisible(false);
            Alert.alert('Success', 'Location added successfully');
        } catch (error) {
            console.error('Error adding location:', error);
            Alert.alert('Error', 'Failed to add location');
        }
    };

    const handleDeleteLocation = async (locationId) => {
        const location = locations.find(loc => loc.id === locationId);
        if (location && location.isDefault) {
            Alert.alert('Cannot Delete', 'Default locations cannot be deleted');
            return;
        }

        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this location?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'locations', locationId));
                            fetchLocations();
                            setViewModalVisible(false);
                            Alert.alert('Success', 'Location deleted successfully');
                        } catch (error) {
                            console.error('Error deleting location:', error);
                            Alert.alert('Error', 'Failed to delete location');
                        }
                    },
                },
            ]
        );
    };

    const getFilteredLocations = () => {
        if (!searchQuery.trim()) return locations;

        const searchLower = searchQuery.toLowerCase();
        return locations.filter(location =>
            location.name?.toLowerCase().includes(searchLower) ||
            location.placeName?.toLowerCase().includes(searchLower) ||
            location.category?.toLowerCase().includes(searchLower) ||
            location.description?.toLowerCase().includes(searchLower)
        );
    };

    const renderLocationItem = ({ item }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => {
                setSelectedLocation(item);
                setViewModalVisible(true);
            }}
            activeOpacity={0.7}
        >
            <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.placeName && (
                        <Text style={styles.placeName}>
                            <MaterialIcons name="location-on" size={14} color="#666" /> {item.placeName}
                        </Text>
                    )}
                    <Text style={styles.itemCategory}>{item.category}</Text>
                </View>
                {!item.isDefault && (
                    <TouchableOpacity
                        style={styles.deleteIconButton}
                        onPress={() => handleDeleteLocation(item.id)}
                    >
                        <MaterialIcons name="delete" size={24} color="#F44336" />
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

            <View style={styles.locationDetails}>
                <Text style={styles.detailText}>
                    <MaterialIcons name="wb-sunny" size={14} color="#666" /> {item.bestTimeToVisit}
                </Text>
                <Text style={styles.detailText}>
                    <MaterialIcons name="thermostat" size={14} color="#666" /> {item.averageTemperature}
                </Text>
            </View>

            {item.attractions && item.attractions.length > 0 && (
                <View style={styles.attractionsContainer}>
                    <Text style={styles.attractionsLabel}>Attractions:</Text>
                    <Text style={styles.attractionsText} numberOfLines={1}>
                        {Array.isArray(item.attractions) ? item.attractions.join(', ') : item.attractions}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Locations</Text>
                <Text style={styles.headerSubtitle}>Manage tour destinations</Text>
            </View>

            <View style={styles.controls}>
                <TextInput
                    mode="outlined"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                    left={<TextInput.Icon icon="magnify" />}
                    activeOutlineColor="#6200EE"
                />
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setAddModalVisible(true)}
                >
                    <MaterialIcons name="add" size={24} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Add Location</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={getFilteredLocations()}
                renderItem={renderLocationItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="place" size={64} color="#CCCCCC" />
                        <Text style={styles.emptyText}>No locations found</Text>
                        <Text style={styles.emptySubtext}>Add your first location</Text>
                    </View>
                }
            />

            {/* View Location Modal */}
            <Modal
                visible={viewModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setViewModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Location Details</Text>
                            <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {selectedLocation && (
                            <ScrollView 
                                style={styles.modalBody}
                                contentContainerStyle={styles.modalContentInner}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>NAME:</Text>
                                    <Text style={styles.detailValue}>{selectedLocation.name}</Text>
                                </View>
                                {selectedLocation.placeName && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>PLACE NAME:</Text>
                                        <Text style={styles.detailValue}>{selectedLocation.placeName}</Text>
                                    </View>
                                )}
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>CATEGORY:</Text>
                                    <Text style={styles.detailValue}>{selectedLocation.category}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>DESCRIPTION:</Text>
                                    <Text style={styles.detailValue}>{selectedLocation.description}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>BEST TIME TO VISIT:</Text>
                                    <Text style={styles.detailValue}>{selectedLocation.bestTimeToVisit}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>TEMPERATURE:</Text>
                                    <Text style={styles.detailValue}>{selectedLocation.averageTemperature}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>LANGUAGE:</Text>
                                    <Text style={styles.detailValue}>{selectedLocation.language}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>CURRENCY:</Text>
                                    <Text style={styles.detailValue}>{selectedLocation.currency}</Text>
                                </View>
                                {selectedLocation.attractions && selectedLocation.attractions.length > 0 && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>ATTRACTIONS:</Text>
                                        <Text style={styles.detailValue}>
                                            {Array.isArray(selectedLocation.attractions) 
                                                ? selectedLocation.attractions.join(', ') 
                                                : selectedLocation.attractions}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>RATING:</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedLocation.rating} ⭐ ({selectedLocation.reviews} reviews)
                                    </Text>
                                </View>

                                {!selectedLocation.isDefault && (
                                    <TouchableOpacity
                                        style={styles.deleteModalButton}
                                        onPress={() => handleDeleteLocation(selectedLocation.id)}
                                    >
                                        <MaterialIcons name="delete" size={20} color="#FFFFFF" />
                                        <Text style={styles.deleteModalButtonText}>Delete Location</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Add Location Modal */}
            <Modal
                visible={addModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Location</Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalFormInner}
                            showsVerticalScrollIndicator={false}
                        >
                            <TextInput
                                mode="outlined"
                                label="Location Name *"
                                value={locationForm.name}
                                onChangeText={(text) => setLocationForm({ ...locationForm, name: text })}
                                style={styles.input}
                                activeOutlineColor="#6200EE"
                            />
                            <TextInput
                                mode="outlined"
                                label="Place Name"
                                value={locationForm.placeName}
                                onChangeText={(text) => setLocationForm({ ...locationForm, placeName: text })}
                                style={styles.input}
                                activeOutlineColor="#6200EE"
                            />
                            <TextInput
                                mode="outlined"
                                label="Description"
                                value={locationForm.description}
                                onChangeText={(text) => setLocationForm({ ...locationForm, description: text })}
                                style={styles.input}
                                multiline
                                numberOfLines={3}
                                activeOutlineColor="#6200EE"
                            />
                            <TextInput
                                mode="outlined"
                                label="Category"
                                value={locationForm.category}
                                onChangeText={(text) => setLocationForm({ ...locationForm, category: text })}
                                style={styles.input}
                                activeOutlineColor="#6200EE"
                            />
                            <TextInput
                                mode="outlined"
                                label="Attractions (comma separated)"
                                value={locationForm.attractions}
                                onChangeText={(text) => setLocationForm({ ...locationForm, attractions: text })}
                                style={styles.input}
                                activeOutlineColor="#6200EE"
                            />
                            <TextInput
                                mode="outlined"
                                label="Best Time to Visit"
                                value={locationForm.bestTimeToVisit}
                                onChangeText={(text) => setLocationForm({ ...locationForm, bestTimeToVisit: text })}
                                style={styles.input}
                                activeOutlineColor="#6200EE"
                            />
                            <TextInput
                                mode="outlined"
                                label="Average Temperature"
                                value={locationForm.averageTemperature}
                                onChangeText={(text) => setLocationForm({ ...locationForm, averageTemperature: text })}
                                style={styles.input}
                                activeOutlineColor="#6200EE"
                            />
                            <TextInput
                                mode="outlined"
                                label="Language"
                                value={locationForm.language}
                                onChangeText={(text) => setLocationForm({ ...locationForm, language: text })}
                                style={styles.input}
                                activeOutlineColor="#6200EE"
                            />
                            <TextInput
                                mode="outlined"
                                label="Currency"
                                value={locationForm.currency}
                                onChangeText={(text) => setLocationForm({ ...locationForm, currency: text })}
                                style={styles.input}
                                activeOutlineColor="#6200EE"
                            />
                            <TextInput
                                mode="outlined"
                                label="Image URL"
                                value={locationForm.image}
                                onChangeText={(text) => setLocationForm({ ...locationForm, image: text })}
                                style={styles.input}
                                activeOutlineColor="#6200EE"
                            />

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleAddLocation}
                            >
                                <MaterialIcons name="save" size={20} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Save Location</Text>
                            </TouchableOpacity>
                        </ScrollView>
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
    searchInput: {
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
    },
    addButton: {
        backgroundColor: '#6200EE',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
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
        marginBottom: 8,
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
    placeName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    itemCategory: {
        fontSize: 12,
        color: '#6200EE',
        fontWeight: '600',
        backgroundColor: '#F3E5F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    deleteIconButton: {
        padding: 8,
    },
    description: {
        fontSize: 14,
        color: '#555',
        marginBottom: 12,
        lineHeight: 20,
    },
    locationDetails: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 8,
    },
    detailText: {
        fontSize: 13,
        color: '#666',
    },
    attractionsContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    attractionsLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 4,
    },
    attractionsText: {
        fontSize: 13,
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
    modalFormInner: {
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
    input: {
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 12,
        gap: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteModalButton: {
        backgroundColor: '#F44336',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 24,
        gap: 8,
    },
    deleteModalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});