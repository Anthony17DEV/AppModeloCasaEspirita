import React, { useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	SafeAreaView,
	Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import MenuLateral from '@/components/MenuLateral';

const COR_PRINCIPAL = '#1B2669';
const COR_FUNDO = '#F4F6F8';

export default function HomeScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar style="light" backgroundColor={COR_PRINCIPAL} translucent={false} />

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
					<Text style={styles.sectionTitle}>Últimos Avisos</Text>

					<View style={[styles.feedCard, styles.shadow]}>
						<View style={styles.feedHeader}>
							<View style={styles.tagPalestra}>
								<Text style={styles.tagText}>Palestra</Text>
							</View>
							<Text style={styles.feedDate}>Hoje, 19:30</Text>
						</View>
						<Text style={styles.feedTitle}>O Evangelho Segundo o Espiritismo</Text>
						<Text style={styles.feedDesc}>
							Estudo do Capítulo I: Não vim destruir a lei. Transmissão ao vivo e presencial no salão principal.
						</Text>
					</View>

				</View>
			</ScrollView>

			<MenuLateral
				isOpen={isMenuOpen}
				onClose={() => setIsMenuOpen(false)}
				isAdmin={true}
			/>

		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: COR_PRINCIPAL
	},
	scrollContent: {
		flex: 1,
		backgroundColor: COR_FUNDO
	},

	shadow: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 3,
	},

	headerBar: {
		height: 60,
		backgroundColor: COR_PRINCIPAL,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		borderBottomWidth: 0,
		elevation: 5,
		zIndex: 10,
	},
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },

	welcomeSection: {
		paddingHorizontal: 20,
		paddingTop: 24,
		paddingBottom: 20,
	},
	welcomeTitle: { fontSize: 26, fontWeight: 'bold', color: '#2C3E50' },
	welcomeSubtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 4 },

	cardsContainer: {
		paddingHorizontal: 20,
		gap: 16,
		marginBottom: 32
	},
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
	cardTextContent: {
		flex: 1,
	},
	cardTitle: { color: '#2C3E50', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
	cardDesc: { color: '#7F8C8D', fontSize: 13, lineHeight: 18, paddingRight: 10 },

	feedSection: { paddingHorizontal: 20, paddingBottom: 40 },
	sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16 },
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
	feedDate: { fontSize: 12, color: '#95A5A6', fontWeight: '500' },
	feedTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
	feedDesc: { fontSize: 14, color: '#546E7A', lineHeight: 22 },
});