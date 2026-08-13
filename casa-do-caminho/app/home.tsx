import React, { useState, useCallback, useEffect } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar, ActivityIndicator, Image, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import MenuLateral from '@/components/MenuLateral';
import { apiService } from '../src/services/apiService';

const COR_PRINCIPAL = '#1B2669';
const COR_FUNDO = '#F4F6F8';

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldPlaySound: true,
		shouldSetBadge: true,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object') return resposta;
	let texto = String(resposta).trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const start = texto.indexOf('{"success"');
		if (start !== -1) {
			let sub = texto.substring(start);
			const end = sub.lastIndexOf('}');
			if (end !== -1) { return JSON.parse(sub.substring(0, end + 1)); }
		}
	} catch (e) { }
	return null;
};

const corrigeAcentos = (str: string) => {
	if (!str) return '';
	try { return decodeURIComponent(escape(str)); } catch (e) { return str; }
};

const ImagemAutoAjustavel = ({ uri }: { uri: string }) => {
	const [ratio, setRatio] = useState<number>(1);

	useEffect(() => {
		if (uri) {
			Image.getSize(
				uri,
				(width, height) => {
					if (width > 0 && height > 0) {
						setRatio(width / height);
					}
				},
				() => {
					setRatio(16 / 9);
				}
			);
		}
	}, [uri]);

	return (
		<Image
			source={{ uri }}
			style={{ width: '100%', aspectRatio: ratio }}
			resizeMode="contain"
		/>
	);
};

export default function HomeScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [atividadesRecentes, setAtividadesRecentes] = useState<any[]>([]);
	const [postagensRecentes, setPostagensRecentes] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const registrarPushNotification = async (idUsuario: number) => {
		if (Platform.OS === 'android') {
			await Notifications.setNotificationChannelAsync('default', {
				name: 'default',
				importance: Notifications.AndroidImportance.MAX,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: '#1B2669',
			});
		}

		if (Device.isDevice) {
			const { status: existingStatus } = await Notifications.getPermissionsAsync();
			let finalStatus = existingStatus;

			if (existingStatus !== 'granted') {
				const { status } = await Notifications.requestPermissionsAsync();
				finalStatus = status;
			}

			if (finalStatus !== 'granted') {
				console.log('Permissão para push notification negada.');
				return;
			}

			const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
			const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

			try {
				await apiService.api.post('api_salvar_token.php', {
					id_usuario: idUsuario,
					token: token
				});
			} catch (error) {
				console.log("Erro ao salvar token", error);
			}
		} else {
			console.log('Push Notifications requerem dispositivo físico.');
		}
	};

	const carregarDashboard = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let codigo = '';
			let nivel = '';
			let idUsuario = 0;

			if (session) {
				const user = JSON.parse(session);
				codigo = user.codigo_casa;
				nivel = user.nivel_acesso;
				idUsuario = user.id;

				registrarPushNotification(idUsuario);

			} else {
				router.replace('/');
				return;
			}

			const responseAtiv = await apiService.api.get(`api_listar_atividades.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resDataAtiv = parseJSONSeguro(responseAtiv.data);
			if (resDataAtiv && resDataAtiv.success) {
				const ativas = resDataAtiv.data.filter((a: any) => a.situacao === 'Ativa' || a.situacao === 'Ativo');
				setAtividadesRecentes(ativas.slice(0, 3));
			}

			const responsePosts = await apiService.api.get(`api_listar_postagens.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resDataPosts = parseJSONSeguro(responsePosts.data);
			if (resDataPosts && resDataPosts.success) {
				setPostagensRecentes(resDataPosts.data);
			}

		} catch (error) {
			console.log("Erro ao carregar o dashboard:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregarDashboard();
		}, [])
	);

	const getCorCategoria = (cat: string) => {
		switch (cat) {
			case 'Aviso': return '#E3F2FD';
			case 'Palestra': return '#FFF3E0';
			case 'Social': return '#E8F5E9';
			case 'Estudo': return '#F3E5F5';
			default: return '#F0F2F5';
		}
	};

	const getCorTextoCategoria = (cat: string) => {
		switch (cat) {
			case 'Aviso': return '#1976D2';
			case 'Palestra': return '#E65100';
			case 'Social': return '#2E7D32';
			case 'Estudo': return '#6A1B9A';
			default: return '#333';
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRINCIPAL} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>RIVAIL</Text>
				<TouchableOpacity style={styles.menuButton} onPress={() => router.push('/notificacoes')}>
					<Ionicons name="notifications-outline" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
				<View style={styles.welcomeSection}>
					<Text style={styles.welcomeSubtitle}>Paz e bem. O que vamos ver hoje?</Text>
				</View>

				<View style={styles.cardsContainer}>
					<TouchableOpacity style={[styles.highlightCard, styles.shadow]} onPress={() => router.push('/associado')}>
						<View style={styles.cardIconContainer}>
							<Ionicons name="heart" size={24} color={COR_PRINCIPAL} />
						</View>
						<View style={styles.cardTextContent}>
							<Text style={styles.cardTitle}>Torne-se Associado</Text>
							<Text style={styles.cardDesc}>Sua contribuição ajuda a manter nossas obras assistenciais.</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="#CCC" />
					</TouchableOpacity>

					<TouchableOpacity style={[styles.highlightCard, styles.shadow]} onPress={() => router.push('/atividades')}>
						<View style={[styles.cardIconContainer, { backgroundColor: '#E8F5E9' }]}>
							<Ionicons name="calendar" size={24} color="#2E7D32" />
						</View>
						<View style={styles.cardTextContent}>
							<Text style={styles.cardTitle}>Atividades da Casa</Text>
							<Text style={styles.cardDesc}>Confira os horários de palestras e passes.</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="#CCC" />
					</TouchableOpacity>
				</View>

				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRINCIPAL} style={{ marginTop: 20 }} />
				) : (
					<>
						{postagensRecentes.length > 0 && (
							<View style={styles.feedSection}>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
									<Text style={styles.sectionTitle}>Mural de Avisos</Text>
								</View>

								{postagensRecentes.map(post => {
									const imagemPost = post.imagem || (post.fotos && post.fotos.length > 0 ? post.fotos[0] : null);
									return (
										<View key={post.id} style={[styles.postCard, styles.shadow]}>

											{imagemPost ? (
												<ImagemAutoAjustavel uri={imagemPost} />
											) : null}

											<View style={styles.postBody}>
												<View style={styles.postHeader}>
													<View style={[styles.tagPalestra, { backgroundColor: getCorCategoria(corrigeAcentos(post.categoria)) }]}>
														<Text style={[styles.tagText, { color: getCorTextoCategoria(corrigeAcentos(post.categoria)) }]}>
															{corrigeAcentos(post.categoria)}
														</Text>
													</View>
													<Text style={styles.feedDate}>{post.data_criacao}</Text>
												</View>
												<Text style={styles.feedTitle}>{corrigeAcentos(post.titulo)}</Text>
												<Text style={styles.feedDesc} numberOfLines={3}>{corrigeAcentos(post.conteudo)}</Text>
											</View>
										</View>
									);
								})}
							</View>
						)}

						<View style={styles.feedSection}>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
								<Text style={styles.sectionTitle}>Próximas Atividades</Text>
								<TouchableOpacity onPress={() => router.push('/atividades')}>
									<Text style={{ color: COR_PRINCIPAL, fontWeight: 'bold' }}>Ver Todas</Text>
								</TouchableOpacity>
							</View>

							{atividadesRecentes.length === 0 ? (
								<Text style={{ textAlign: 'center', color: '#7F8C8D', marginTop: 10 }}>Nenhuma atividade cadastrada ainda.</Text>
							) : (
								atividadesRecentes.map((ativ) => (
									<View key={ativ.id} style={[styles.feedCard, styles.shadow]}>
										<View style={styles.feedHeader}>
											<View style={styles.tagPalestra}>
												<Text style={styles.tagText}>{corrigeAcentos(ativ.dia_semana)}</Text>
											</View>
											<Text style={styles.feedDate}>{ativ.hora_inicial} às {ativ.hora_final}</Text>
										</View>
										<Text style={styles.feedTitle}>{corrigeAcentos(ativ.nome)}</Text>
										<Text style={styles.feedDesc}>
											<Text style={{ fontWeight: 'bold', color: '#2C3E50' }}>Instituição:</Text> {corrigeAcentos(ativ.instituicao)}{'\n'}
											<Text style={{ fontWeight: 'bold', color: '#2C3E50' }}>Dirigente:</Text> {corrigeAcentos(ativ.coordenadores)}
										</Text>
									</View>
								))
							)}
						</View>
					</>
				)}

				<View style={{ height: 30 }} />
			</ScrollView>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	scrollContent: { flex: 1, backgroundColor: COR_FUNDO },
	shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
	headerBar: { height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20), paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight, backgroundColor: COR_PRINCIPAL, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, elevation: 5, zIndex: 10 },
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', letterSpacing: 1.5 },
	welcomeSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
	welcomeSubtitle: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', marginTop: 4 },
	cardsContainer: { paddingHorizontal: 20, gap: 16, marginBottom: 32 },
	highlightCard: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
	cardIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EBF4FC', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
	cardTextContent: { flex: 1 },
	cardTitle: { color: '#2C3E50', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
	cardDesc: { color: '#7F8C8D', fontSize: 13, lineHeight: 18, paddingRight: 10 },
	feedSection: { paddingHorizontal: 20, paddingBottom: 25 },
	sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
	postCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
	postBody: { padding: 20 },
	postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
	feedCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 16 },
	feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
	tagPalestra: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FFF0E6' },
	tagText: { fontSize: 12, fontWeight: 'bold', color: '#E67E22' },
	feedDate: { fontSize: 12, color: '#95A5A6', fontWeight: 'bold' },
	feedTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
	feedDesc: { fontSize: 14, color: '#546E7A', lineHeight: 22 },
});