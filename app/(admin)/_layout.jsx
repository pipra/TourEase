import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function AdminLayout() {
    return (
        <Tabs
            initialRouteName="overview"
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
                name="overview"
                options={{
                    title: "Overview",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="dashboard" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: "Users",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="people" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="applications"
                options={{
                    title: "Applications",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="assignment" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="locations"
                options={{
                    title: "Locations",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="place" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="bookings"
                options={{
                    title: "Bookings",
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons name="event-note" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

