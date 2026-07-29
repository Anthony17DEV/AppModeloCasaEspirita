import React, { useEffect, useRef } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Animated,
	Dimensions,
	Image,
	Platform,
	Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const LARGURA_MENU = width * 0.8;
const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
	isOpen: boolean;
	onClose: () => void;
	isAdmin?: boolean;
}

export default function MenuLateral({ isOpen, onClose, isAdmin = true }: Props) {
	const slideAnim = useRef(new Animated.Value(-LARGURA_MENU)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: isOpen ? 0 : -LARGURA_MENU,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.timing(opacityAnim, {
				toValue: isOpen ? 1 : 0,
				duration: 250,
				useNativeDriver: true,
			}),
		]).start();
	}, [isOpen]);

	const MenuItem = ({ icon, label, route, color = '#333' }: any) => (
		<TouchableOpacity
			style={styles.menuItem}
			onPress={() => {
				onClose();
				if (route) router.push(route);
			}}
		>
			<View style={styles.iconWrapper}>
				<Ionicons name={icon} size={22} color={COR_PRIMARIA} />
			</View>
			<Text style={[styles.menuItemText, { color }]}>{label}</Text>
		</TouchableOpacity>
	);

	return (
		<>
			<AnimatedPressable
				style={[styles.overlay, { opacity: opacityAnim }]}
				onPress={onClose}
				pointerEvents={isOpen ? 'auto' : 'none'}
			/>

			<Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>

				<View style={styles.header}>
					<TouchableOpacity style={styles.closeBtn} onPress={onClose}>
						<Ionicons name="close" size={28} color="#FFF" />
					</TouchableOpacity>

					<View style={styles.logoCircle}>
						<Image
							source={require('@/assets/images/logo.png')}
							style={styles.logoImage}
							resizeMode="contain"
						/>
					</View>
					<Text style={styles.headerTitle}>Casa do Caminho</Text>
					<Text style={styles.headerSubtitle}>Núcleo de Estudos Espíritas</Text>
				</View>

				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					<Text style={styles.sectionTitle}>Navegação</Text>
					<MenuItem icon="person-outline" label="Meu Perfil" route="/perfil" />
					<MenuItem icon="wallet-outline" label="Financeiro" route="/financeiro" />
					<MenuItem icon="document-text-outline" label="Termo de Voluntário" route="/voluntario" />
					<MenuItem icon="calendar-outline" label="Atividades" route="/atividades" />
					<MenuItem icon="folder-open-outline" label="Documentos" route="/documentos" />

					{isAdmin && (
						<View style={styles.adminSection}>
							<View style={styles.divider} />
							<Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>Painel Admin</Text>
							<MenuItem icon="business-outline" label="Casa Espírita" route="/admin/casa" />
							<MenuItem icon="people-outline" label="Usuários" route="/admin/usuarios" />
							<MenuItem icon="construct-outline" label="Atividades" route="/admin/atividades" />
							<MenuItem icon="create-outline" label="Postagens Feed" route="/admin/postagens" />
							<MenuItem icon="cash-outline" label="Contas Pagar/Receber" route="/admin/financeiro" />
						</View>
					)}

					<View style={styles.divider} />
					<MenuItem
						icon="log-out-outline"
						label="Sair da Conta"
						color="#D32F2F"
						route="/"
					/>
					<View style={{ height: 50 }} />
				</ScrollView>
			</Animated.View>
		</>
	);
}

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.6)',
		zIndex: 99,
		elevation: 15,
	},
	container: {
		position: 'absolute',
		top: 0, bottom: 0, left: 0,
		width: LARGURA_MENU,
		backgroundColor: '#FFF',
		zIndex: 100,
		borderTopRightRadius: 25,
		borderBottomRightRadius: 25,
		overflow: 'hidden',
		...Platform.select({
			ios: { shadowColor: '#000', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10 },
			android: { elevation: 20 },
		}),
	},
	header: {
		backgroundColor: COR_PRIMARIA,
		paddingTop: 50,
		paddingBottom: 30,
		alignItems: 'center',
		paddingHorizontal: 20,
		borderBottomRightRadius: 60,
		position: 'relative',
	},
	closeBtn: {
		position: 'absolute',
		top: 45,
		right: 20,
		padding: 5,
		zIndex: 10,
	},
	logoCircle: {
		width: 80,
		height: 80,
		backgroundColor: '#FFF',
		borderRadius: 40,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 12,
		borderWidth: 3,
		borderColor: COR_DETALHE,
		marginTop: 10,
	},
	logoImage: {
		width: 60,
		height: 60,
	},
	headerTitle: {
		color: '#FFF',
		fontSize: 20,
		fontWeight: 'bold',
	},
	headerSubtitle: {
		color: 'rgba(255,255,255,0.7)',
		fontSize: 12,
		marginTop: 4,
	},
	content: {
		flex: 1,
		padding: 15,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#999',
		marginLeft: 10,
		marginBottom: 10,
		marginTop: 15,
		letterSpacing: 1,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 12,
		marginBottom: 4,
	},
	iconWrapper: {
		width: 35,
		alignItems: 'center',
		marginRight: 12,
	},
	menuItemText: {
		fontSize: 16,
		fontWeight: '500',
	},
	divider: {
		height: 1,
		backgroundColor: '#EEE',
		marginVertical: 15,
		marginHorizontal: 10,
	},
	adminSection: {
		marginTop: 5,
	}
});