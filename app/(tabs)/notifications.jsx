import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../(auth)/firebase';
import { deleteNotification, listenForUserNotifications } from '../../utils/realtimeNotificationService';

export default function Notifications() {
    const [userNotifications, setUserNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // The listener will automatically update the notifications
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    // Set up notification listener
    useEffect(() => {
        let unsubscribe;
        
        const setupNotificationListener = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser?.uid) {
                console.log('No user logged in');
                return;
            }

            try {
                console.log('Setting up notification listener for user:', currentUser.uid);
                
                // Listen for booking response notifications from guides
                unsubscribe = listenForUserNotifications(currentUser.uid, (notifications) => {
                    console.log('User notifications updated:', notifications.length);
                    
                    // Store notifications in state for display
                    setUserNotifications(notifications);
                });

                console.log('Notification listener set up successfully');
            } catch (error) {
                console.error('Error setting up notification listener:', error);
            }
        };

        setupNotificationListener();

        // Cleanup on unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
                console.log('Notification listener cleaned up');
            }
        };
    }, []);

    // Refresh notifications when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            onRefresh();
        }, [onRefresh])
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                <Text style={styles.headerSubtitle}>
                    Stay updated with your booking responses
                </Text>
            </View>

            <View style={styles.content}>
                {userNotifications.length > 0 ? (
                    <FlatList
                        data={userNotifications}
                        renderItem={({ item }) => (
                            <View style={styles.notificationCard}>
                                <View style={styles.notificationHeader}>
                                    <Text style={styles.notificationTitle}>{item.title}</Text>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            await deleteNotification(item.id, 'user');
                                        }}
                                        style={styles.deleteButton}
                                    >
                                        <MaterialIcons name="close" size={20} color="#666" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.notificationMessage}>{item.message}</Text>
                                {item.data && (
                                    <View style={styles.notificationDetails}>
                                        <Text style={styles.notificationDetailText}>
                                            📍 {item.data.location}
                                        </Text>
                                        <Text style={styles.notificationDetailText}>
                                            📅 {item.data.dates}
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
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        contentContainerStyle={styles.listContainer}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                        <Text style={styles.emptyStateText}>No notifications yet</Text>
                        <Text style={styles.emptyStateSubtext}>
                            You&apos;ll receive updates about your bookings here
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
        backgroundColor: '#f8f9fa',
    },
    header: {
        backgroundColor: '#6200EE',
        marginTop: 45,
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#E8EAED',
        opacity: 0.9,
    },
    content: {
        flex: 1,
        paddingTop: 20,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
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
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 100,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 20,
        opacity: 0.5,
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
});
