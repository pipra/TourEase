import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../(auth)/firebase';
import { deleteNotification, listenForGuideNotifications } from '../../utils/realtimeNotificationService';

export default function Notifications() {
    const [guideNotifications, setGuideNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        let unsubscribe;
        
        const setupNotificationListener = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser?.uid) {
                console.log('No guide logged in');
                return;
            }

            try {
                console.log('Setting up notification listener for guide:', currentUser.uid);
                
                unsubscribe = listenForGuideNotifications(currentUser.uid, (notifications) => {
                    console.log('Guide notifications updated:', notifications.length);
                    setGuideNotifications(notifications);
                });

                console.log('Notification listener set up successfully');
            } catch (error) {
                console.error('Error setting up notification listener:', error);
            }
        };

        setupNotificationListener();

        return () => {
            if (unsubscribe) {
                unsubscribe();
                console.log('Notification listener cleaned up');
            }
        };
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // The listener will automatically update the notifications
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    useFocusEffect(
        useCallback(() => {
            // Refresh when screen comes into focus
            onRefresh();
        }, [onRefresh])
    );

    const handleDeleteNotification = async (notificationId) => {
        try {
            await deleteNotification(notificationId, 'guide');
            console.log('Notification deleted:', notificationId);
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.notificationsContainer}>
                <Text style={styles.sectionTitle}>Booking Notifications</Text>
                {guideNotifications.length > 0 ? (
                    <FlatList
                        data={guideNotifications}
                        renderItem={({ item }) => (
                            <View style={styles.notificationCard}>
                                <View style={styles.notificationHeader}>
                                    <Text style={styles.notificationTitle}>{item.title}</Text>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteNotification(item.id)}
                                        style={styles.deleteButton}
                                    >
                                        <MaterialIcons name="close" size={20} color="#666" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.notificationMessage}>{item.message}</Text>
                                {item.data && (
                                    <View style={styles.notificationDetails}>
                                        <Text style={styles.notificationDetailText}>
                                            👤 {item.data.userName}
                                        </Text>
                                        <Text style={styles.notificationDetailText}>
                                            📍 {item.data.location}
                                        </Text>
                                        <Text style={styles.notificationDetailText}>
                                            📅 {item.data.dates}
                                        </Text>
                                        <Text style={styles.notificationDetailText}>
                                            👥 {item.data.guests} guests
                                        </Text>
                                        <Text style={styles.notificationDetailText}>
                                            💰 ৳{item.data.totalPrice}
                                        </Text>
                                    </View>
                                )}
                                <Text style={styles.notificationTime}>
                                    {new Date(item.timestamp).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            </View>
                        )}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.notificationsList}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    />
                ) : (
                    <View style={styles.emptyNotifications}>
                        <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
                        <Text style={styles.emptyNotificationsSubtext}>
                            You&apos;ll receive notifications when users book your services
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    notificationsContainer: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        padding: 20,
        backgroundColor: '#FFFFFF',
    },
    notificationsList: {
        padding: 15,
    },
    notificationCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#6200EE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 8,
    },
    deleteButton: {
        padding: 4,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    notificationDetails: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    notificationDetailText: {
        fontSize: 13,
        color: '#555',
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    emptyNotifications: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 100,
    },
    emptyNotificationsText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyNotificationsSubtext: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
});
