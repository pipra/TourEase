import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { auth } from '../(auth)/firebase';
import { listenForGuideNotifications } from '../../utils/realtimeNotificationService';

export default function GuideLayout() {
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        let unsubscribe;
        
        const setupNotificationListener = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser?.uid) return;

            try {
                unsubscribe = listenForGuideNotifications(currentUser.uid, (notifications) => {
                    setNotificationCount(notifications.length);
                });
            } catch (error) {
                console.error('Error setting up notification listener:', error);
            }
        };

        setupNotificationListener();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    return (
        <Tabs
            initialRouteName="bookings"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    paddingBottom: 14,
                    height: 75,
                },
                tabBarLabelStyle: { fontSize: 12, fontWeight: "bold" },
                tabBarActiveTintColor: '#6200EE',
                tabBarInactiveTintColor: '#666',
            }}
        >
            <Tabs.Screen
                name="bookings"
                options={{
                    title: "Bookings",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="event-note" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Notifications",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="notifications" size={24} color={color} />
                    ),
                    tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
                }}
            />
            <Tabs.Screen
                name="statistics"
                options={{
                    title: "Statistics",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="bar-chart" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="person" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
