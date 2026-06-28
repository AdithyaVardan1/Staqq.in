import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, LogOut, Bell, Bookmark } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useWatchlistStore } from '../../store/useWatchlistStore';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut, loading } = useAuthStore();
    const watchlistCount = useWatchlistStore(s => s.tickers.length);

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: signOut,
            },
        ]);
    };

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-bg-dark items-center justify-center px-6" edges={['top']}>
                <View className="items-center">
                    <Text className="text-brand text-3xl font-bold tracking-tight">Staqq</Text>
                    <Text className="text-zinc-400 text-sm mt-2 text-center">
                        Track Indian markets, get spike alerts
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/auth/login')}
                    className="bg-brand rounded-xl py-3 px-8 mt-8 w-full max-w-xs"
                    activeOpacity={0.8}
                >
                    <Text className="text-black font-semibold text-center text-base">Sign In</Text>
                </TouchableOpacity>

                <View className="flex-row mt-4">
                    <Text className="text-zinc-500 text-sm">New here? </Text>
                    <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                        <Text className="text-brand text-sm font-semibold">Create account</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const initial = (user.email?.[0] ?? 'U').toUpperCase();

    return (
        <SafeAreaView className="flex-1 bg-bg-dark" edges={['top']}>
            {/* Avatar + Info */}
            <View className="items-center pt-8 pb-6">
                <View className="w-20 h-20 rounded-full bg-zinc-800 border border-white/10 items-center justify-center">
                    <Text className="text-brand text-2xl font-bold">{initial}</Text>
                </View>
                <Text className="text-white text-lg font-semibold mt-3">{user.email}</Text>
            </View>

            {/* Stats */}
            <View className="flex-row mx-4 mb-6" style={{ gap: 12 }}>
                <View className="flex-1 bg-bg-card border border-white/5 rounded-2xl p-4 items-center">
                    <Bookmark size={20} color="#CAFF00" />
                    <Text className="text-white text-xl font-bold mt-1.5">{watchlistCount}</Text>
                    <Text className="text-zinc-500 text-[10px] mt-0.5">Watchlist</Text>
                </View>
                <View className="flex-1 bg-bg-card border border-white/5 rounded-2xl p-4 items-center">
                    <Bell size={20} color="#CAFF00" />
                    <Text className="text-white text-xl font-bold mt-1.5"> </Text>
                    <Text className="text-zinc-500 text-[10px] mt-0.5">Alerts</Text>
                </View>
            </View>

            {/* Sign Out */}
            <View className="mx-4 mt-4">
                <TouchableOpacity
                    onPress={handleSignOut}
                    className="flex-row items-center justify-center rounded-xl py-3.5 border border-danger/30"
                    activeOpacity={0.8}
                >
                    <LogOut size={18} color="#EF4444" />
                    <Text className="text-danger font-semibold text-sm ml-2">Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
