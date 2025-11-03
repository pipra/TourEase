import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { auth } from '../(auth)/firebase';
import { listenForUserNotifications } from '../../utils/realtimeNotificationService';

const TabLayout = () => {
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((userr) => {
            if (!userr) {
                router.push('/');
                // console.log("There is no user:", userr);
            }
        });
        return () => unsubscribe();
    }, []);

    // Set up global notification listener for user notifications
    useEffect(() => {
        let notificationUnsubscribe;

        const setupGlobalNotificationListener = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser?.uid) return;

            try {
                console.log('🌐 Setting up global user notification listener');
                // Listen for booking response notifications from guides
                notificationUnsubscribe = listenForUserNotifications(currentUser.uid, (notifications) => {
                    console.log('🌐 Global notification update:', notifications.length);
                    // Notifications are automatically shown as push alerts by the listener
                    // This keeps the system active across all tabs
                });

                console.log('✅ Global notification listener active');
            } catch (error) {
                console.error('Error setting up global notification listener:', error);
            }
        };

        setupGlobalNotificationListener();

        // Cleanup on unmount
        return () => {
            if (notificationUnsubscribe) {
                notificationUnsubscribe();
                console.log('🌐 Global notification listener cleaned up');
            }
        };
    }, []);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    paddingBottom: 14,
                    height: 75,
                },
                tabBarLabelStyle: { fontSize: 12, fontWeight: "bold" },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="home" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="place"
                options={{
                    title: "Place",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="location" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="guide"
                options={{
                    title: "Guide",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="search" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Notifications",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="notifications" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="person-sharp" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    )
}

export default TabLayout