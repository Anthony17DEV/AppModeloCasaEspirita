import React, { useEffect, useRef, useState } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, Animated, Dimensions, Image, Platform, Pressable, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../src/services/apiService';

const { width } = Dimensions.get('window');
const LARGURA_MENU = width * 0.8;
const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
	isOpen: boolean;
	onClose: () => void;
}

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	let texto = String(resposta).trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const i = texto.indexOf('{');
		const f = texto.lastIndexOf('}');
		if (i !== -1 && f !== -1) return JSON.parse(texto.substring(i, f + 1));
	} catch (e) { }
	return null;
};

const formatarCNPJ = (cnpj: string) => {
	if (!cnpj) return '';
	const apenasNumeros = String(cnpj).replace(/\D/g, '');
	if (apenasNumeros.length !== 14) return cnpj;
	return apenasNumeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

export default function MenuLateral({ isOpen, onClose }: Props) {
	const slideAnim = useRef(new Animated.Value(-LARGURA_MENU)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;

	const [hasAdminPrivileges, setHasAdminPrivileges] = useState(false);

	const [instituicaoNome, setInstituicaoNome] = useState('Carregando...');
	const [instituicaoSub, setInstituicaoSub] = useState('');
	const [logoUrl, setLogoUrl] = useState<string | null>(null);

	useEffect(() => {
		const verificarPermissoes = async () => {
			if (isOpen) {
				const session = await AsyncStorage.getItem('@user_session');
				if (session) {
					const user = JSON.parse(session);
					const isAdmin = user.nivel_acesso === 'ADMINISTRADOR';

					setHasAdminPrivileges(isAdmin || user.nivel_acesso === 'DIRETORIA');

					if (isAdmin) {
						setInstituicaoNome('Gestão Federativa');
						setInstituicaoSub('Administrador Supremo');
						setLogoUrl(null);
					} else {
						try {
							const res = await apiService.api.get(`api_listar_instituicoes.php?codigo_casa=${user.codigo_casa}&nivel=${user.nivel_acesso}`);
							const resData = parseJSONSeguro(res.data);

							if (resData && resData.success && resData.data.length > 0) {
								const casa = resData.data[0];
								setInstituicaoNome(casa.nome || 'Minha Instituição');
								setInstituicaoSub(casa.cnpj ? `CNPJ: ${formatarCNPJ(casa.cnpj)}` : `Código: ${casa.codigo}`);

								if (casa.logo) {
									if (casa.logo.startsWith('http') || casa.logo.startsWith('data:')) {
										setLogoUrl(casa.logo);
									} else {
										setLogoUrl(`https://sistemascactus.com/apicactus/casadocaminho/${casa.logo}`);
									}
								} else {
									setLogoUrl(null);
								}
							}
						} catch (error) {
							console.log('Erro ao buscar dados da casa pro menu', error);
							setInstituicaoNome('Minha Instituição');
						}
					}
				}
			}
		};

		verificarPermissoes();

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

	const handleLogout = () => {
		Alert.alert(
			"Sair da Conta",
			"Tem certeza que deseja sair do aplicativo?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Sair",
					style: "destructive",
					onPress: async () => {
						await AsyncStorage.removeItem('@user_session');
						onClose();
						router.replace('/');
					}
				}
			]
		);
	};

	const MenuItem = ({ icon, label, route, color = '#333', onPress = null }: any) => (
		<TouchableOpacity
			style={styles.menuItem}
			onPress={() => {
				if (onPress) {
					onPress();
				} else {
					onClose();
					if (route) router.push(route);
				}
			}}
		>
			<View style={styles.iconWrapper}>
				<Ionicons name={icon} size={22} color={color === '#D32F2F' ? color : COR_PRIMARIA} />
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
							source={logoUrl ? { uri: logoUrl } : require('@/assets/images/logo.png')}
							style={styles.logoImage}
							resizeMode="cover"
						/>
					</View>
					<Text style={styles.headerTitle} numberOfLines={1}>{instituicaoNome}</Text>
					<Text style={styles.headerSubtitle}>{instituicaoSub}</Text>
				</View>

				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					<Text style={styles.sectionTitle}>Navegação</Text>
					<MenuItem icon="home-outline" label="Home" route="/home" />
					<MenuItem icon="person-outline" label="Meu Perfil" route="/perfil" />
					<MenuItem icon="wallet-outline" label="Financeiro" route="/financeiro" />
					<MenuItem icon="document-text-outline" label="Termo de Voluntário" route="/voluntario" />
					<MenuItem icon="calendar-outline" label="Atividades" route="/atividades" />
					<MenuItem icon="folder-open-outline" label="Documentos" route="/documentos" />

					{hasAdminPrivileges && (
						<View style={styles.adminSection}>
							<View style={styles.divider} />
							<Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>Painel Admin</Text>
							<MenuItem icon="business-outline" label="Instituições" route="/admin/casa" />
							<MenuItem icon="people-outline" label="Frequentadores" route="/admin/frequentadores" />
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
						onPress={handleLogout}
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
		overflow: 'hidden',
	},
	logoImage: {
		width: '100%',
		height: '100%',
	},
	headerTitle: {
		color: '#FFF',
		fontSize: 18,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	headerSubtitle: {
		color: 'rgba(255,255,255,0.7)',
		fontSize: 13,
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
		textTransform: 'uppercase',
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
		fontSize: 15,
		fontWeight: '600',
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