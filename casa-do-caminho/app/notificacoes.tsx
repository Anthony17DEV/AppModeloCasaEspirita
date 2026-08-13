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
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MenuLateral from '@/components/MenuLateral';
import { apiService } from '../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
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
			if (end !== -1) { return JSON.parse(sub.substring(0, end + 1)); }
		}
	} catch (e) { }
	return null;
};

const corrigeAcentos = (str: string) => {
	if (!str) return '';
	try { return decodeURIComponent(escape(str)); } catch (e) { return str; }
};

export default function NotificacoesScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [notificacoes, setNotificacoes] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const carregarNotificacoes = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let codigo = '';
			let nivel = '';
			let dataCriacaoUser = 'Recentemente';

			if (session) {
				const user = JSON.parse(session);
				codigo = user.codigo_casa;
				nivel = user.nivel_acesso;

				if (user.data_cadastro) dataCriacaoUser = user.data_cadastro;
				else if (user.data_criacao) dataCriacaoUser = user.data_criacao;

			} else {
				router.replace('/');
				return;
			}

			const notificacaoBoasVindas = {
				id: 'boas_vindas_app',
				tipo: 'Sistema',
				titulo: 'Bem-vindo(a) ao Sistema Rivail!',
				mensagem: 'É uma alegria ter você aqui! Fique de olho nesta aba para acompanhar os avisos importantes, lembretes de palestras e atividades da nossa Casa Espírita.',
				data: dataCriacaoUser
			};

			const response = await apiService.api.get(`api_listar_notificacoes.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success && Array.isArray(resData.data)) {
				setNotificacoes([notificacaoBoasVindas, ...resData.data]);
			} else {
				setNotificacoes([notificacaoBoasVindas]);
			}
		} catch (error) {
			console.log("Erro ao buscar notificações:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregarNotificacoes();
		}, [])
	);

	const getIconePorTipo = (tipo: string) => {
		switch (tipo) {
			case 'Urgente': return { nome: 'alert-circle', cor: '#ED1C24' };
			case 'Atividade': return { nome: 'calendar', cor: '#28a745' };
			case 'Sistema': return { nome: 'star', cor: '#F1C40F' };
			default: return { nome: 'notifications', cor: COR_PRIMARIA };
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Notificações</Text>
				<TouchableOpacity style={styles.menuButton} onPress={carregarNotificacoes}>
					<Ionicons name="refresh" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 40 }} />
				) : notificacoes.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Ionicons name="notifications-off-outline" size={60} color="#CCC" />
						<Text style={styles.emptyText}>Sua caixa de notificações está vazia.</Text>
					</View>
				) : (
					notificacoes.map((item) => {
						const icone = getIconePorTipo(corrigeAcentos(item.tipo));
						return (
							<View key={item.id} style={styles.card}>
								<View style={[styles.iconCircle, { backgroundColor: icone.cor + '15' }]}>
									<Ionicons name={icone.nome as any} size={22} color={icone.cor} />
								</View>
								<View style={styles.cardContent}>
									<View style={styles.cardHeader}>
										<Text style={styles.cardTitle}>{corrigeAcentos(item.titulo)}</Text>
										<Text style={styles.cardDate}>{item.data}</Text>
									</View>
									<Text style={styles.cardMsg}>{corrigeAcentos(item.mensagem)}</Text>
								</View>
							</View>
						);
					})
				)}

				<View style={{ height: 40 }} />
			</ScrollView>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	scrollContent: { flex: 1, padding: 15 },

	headerBar: {
		height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20),
		paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
		backgroundColor: COR_PRIMARIA,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		elevation: 5,
		zIndex: 10,
	},
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },

	emptyContainer: { alignItems: 'center', marginTop: 60 },
	emptyText: { color: '#7F8C8D', fontSize: 15, marginTop: 15 },

	card: {
		backgroundColor: '#FFF',
		borderRadius: 12,
		padding: 15,
		flexDirection: 'row',
		marginBottom: 12,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#E0E0E0'
	},
	iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
	cardContent: { flex: 1, marginLeft: 12 },
	cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
	cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', flex: 1, marginRight: 5 },
	cardDate: { fontSize: 11, color: '#95A5A6' },
	cardMsg: { fontSize: 13, color: '#546E7A', lineHeight: 18 }
});