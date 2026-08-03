import React, { useState, useCallback } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Platform,
	StatusBar,
	ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import MenuLateral from '@/components/MenuLateral';
import { apiService } from '../src/services/apiService';

const COR_PRINCIPAL = '#1B2669';
const COR_FUNDO = '#F4F6F8';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object') return resposta;
	let texto = String(resposta).trim();
	try { return JSON.parse(texto); } catch (e) { }

	try {
		const start = texto.indexOf('{"success"');
		if (start !== -1) {
			let sub = texto.substring(start);
			const end = sub.lastIndexOf('}');
			if (end !== -1) {
				return JSON.parse(sub.substring(0, end + 1));
			}
		}
	} catch (e) { }
	return null;
};

export default function HomeScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [atividadesRecentes, setAtividadesRecentes] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const carregarDashboard = async () => {
		setIsLoading(true);
		try {
			const response = await apiService.api.get('api_listar_atividades.php');
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				setAtividadesRecentes(resData.data.slice(0, 3));
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

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRINCIPAL} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Casa do Caminho</Text>
				<TouchableOpacity style={styles.menuButton}>
					<Ionicons name="notifications-outline" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

				<View style={styles.welcomeSection}>
					<Text style={styles.welcomeTitle}>Olá, Irmão(ã)!</Text>
					<Text style={styles.welcomeSubtitle}>Paz e bem. O que vamos ver hoje?</Text>
				</View>

				<View style={styles.cardsContainer}>
					<TouchableOpacity style={[styles.highlightCard, styles.shadow]}>
						<View style={styles.cardIconContainer}>
							<Ionicons name="heart" size={24} color={COR_PRINCIPAL} />
						</View>
						<View style={styles.cardTextContent}>
							<Text style={styles.cardTitle}>Torne-se Associado</Text>
							<Text style={styles.cardDesc}>Sua contribuição ajuda a manter nossas obras assistenciais.</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="#CCC" />
					</TouchableOpacity>

					<TouchableOpacity style={[styles.highlightCard, styles.shadow]}>
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

				<View style={styles.feedSection}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
						<Text style={styles.sectionTitle}>Próximas Atividades</Text>
						<TouchableOpacity>
							<Text style={{ color: COR_PRINCIPAL, fontWeight: 'bold' }}>Ver Todas</Text>
						</TouchableOpacity>
					</View>

					{isLoading ? (
						<ActivityIndicator size="large" color={COR_PRINCIPAL} style={{ marginTop: 20 }} />
					) : atividadesRecentes.length === 0 ? (
						<Text style={{ textAlign: 'center', color: '#7F8C8D', marginTop: 10 }}>Nenhuma atividade cadastrada ainda.</Text>
					) : (
						atividadesRecentes.map((ativ) => (
							<View key={ativ.id} style={[styles.feedCard, styles.shadow]}>
								<View style={styles.feedHeader}>
									<View style={styles.tagPalestra}>
										<Text style={styles.tagText}>{ativ.dia_semana}</Text>
									</View>
									<Text style={styles.feedDate}>{ativ.hora_inicial} às {ativ.hora_final}</Text>
								</View>
								<Text style={styles.feedTitle}>{ativ.nome}</Text>
								<Text style={styles.feedDesc}>
									<Text style={{ fontWeight: 'bold', color: '#2C3E50' }}>Instituição:</Text> {ativ.instituicao}{'\n'}
									<Text style={{ fontWeight: 'bold', color: '#2C3E50' }}>Coordenador:</Text> {ativ.coordenadores}
								</Text>
							</View>
						))
					)}

				</View>
			</ScrollView>

			<MenuLateral
				isOpen={isMenuOpen}
				onClose={() => setIsMenuOpen(false)}
				isAdmin={true}
			/>

		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	scrollContent: { flex: 1, backgroundColor: COR_FUNDO },

	shadow: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 3,
	},

	headerBar: {
		height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20),
		paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
		backgroundColor: COR_PRINCIPAL,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		elevation: 5,
		zIndex: 10,
	},
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },

	welcomeSection: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
	welcomeTitle: { fontSize: 26, fontWeight: 'bold', color: '#2C3E50' },
	welcomeSubtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 4 },

	cardsContainer: { paddingHorizontal: 20, gap: 16, marginBottom: 32 },
	highlightCard: {
		backgroundColor: '#FFF',
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderRadius: 16,
	},
	cardIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: '#EBF4FC',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16,
	},
	cardTextContent: { flex: 1 },
	cardTitle: { color: '#2C3E50', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
	cardDesc: { color: '#7F8C8D', fontSize: 13, lineHeight: 18, paddingRight: 10 },

	feedSection: { paddingHorizontal: 20, paddingBottom: 40 },
	sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },

	feedCard: {
		backgroundColor: '#FFF',
		padding: 20,
		borderRadius: 16,
		marginBottom: 16
	},
	feedHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	tagPalestra: {
		backgroundColor: '#FFF0E6',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
	},
	tagText: { color: '#E67E22', fontSize: 12, fontWeight: 'bold' },
	feedDate: { fontSize: 12, color: '#95A5A6', fontWeight: 'bold' },
	feedTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
	feedDesc: { fontSize: 14, color: '#546E7A', lineHeight: 22 },
});