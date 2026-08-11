import React, { useState, useCallback } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity,
	Platform, Alert, ActivityIndicator, StatusBar
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MenuLateral from '@/components/MenuLateral';
import { apiService } from '../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_FUNDO = '#F4F6F8';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	let texto = String(resposta).trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const start = texto.indexOf('{');
		const end = texto.lastIndexOf('}');
		if (start !== -1 && end !== -1 && start < end) {
			return JSON.parse(texto.substring(start, end + 1));
		}
	} catch (e) { }
	return null;
};

export default function FinanceiroScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [pixCopiado, setPixCopiado] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const [dadosFinanceiros, setDadosFinanceiros] = useState({
		valor_mensal: '0,00',
		status: 'EM DIA',
		proximo_vencimento: 'Sem pendências',
		faturas: [] as any[],
		historico: [] as any[]
	});

	const carregarMeuFinanceiro = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let idFrequentador = 0;
			let idUsuario = 0;

			if (session) {
				const user = JSON.parse(session);
				idFrequentador = user.id_frequentador || 0;
				idUsuario = user.id || 0;
			} else {
				router.replace('/');
				return;
			}

			const response = await apiService.api.get(`api_meu_financeiro.php?id_frequentador=${idFrequentador}&id_usuario=${idUsuario}`);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success && resData.data) {
				setDadosFinanceiros(resData.data);
			} else {
				Alert.alert("Atenção", "Não foi possível carregar as informações financeiras.");
			}
		} catch (error) {
			console.log("Erro no financeiro:", error);
			Alert.alert("Erro", "Falha de comunicação com o servidor.");
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregarMeuFinanceiro();
		}, [])
	);

	const copiarChavePix = () => {
		const chavePix = "03.456.567/0001-65";
		Alert.alert(
			"Chave PIX (CNPJ)",
			`${chavePix}\n\nUtilize este CNPJ no seu aplicativo bancário para realizar o pagamento.`,
			[{ text: "Entendido", onPress: () => setPixCopiado(true) }]
		);
	};

	const isEmDia = dadosFinanceiros.status === 'EM DIA';

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Minha Contribuição</Text>
				<TouchableOpacity style={styles.menuButton} onPress={carregarMeuFinanceiro}>
					<Ionicons name="refresh" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 40 }} />
				) : (
					<>
						<View style={styles.statusCard}>
							<View style={styles.statusHeader}>
								<View>
									<Text style={styles.statusLabel}>Sua Situação</Text>
									<Text style={[styles.statusTitle, { color: isEmDia ? '#28a745' : '#ED1C24' }]}>
										{dadosFinanceiros.status}
									</Text>
								</View>
								<View style={[styles.statusBadge, { backgroundColor: isEmDia ? '#E8F5E9' : '#FFEBEE' }]}>
									<Feather
										name={isEmDia ? "check-circle" : "alert-circle"}
										size={24}
										color={isEmDia ? "#28a745" : "#ED1C24"}
									/>
								</View>
							</View>

							<View style={styles.divider} />

							<View style={styles.infoRow}>
								<View style={{ flex: 1 }}>
									<Text style={styles.infoSubLabel}>Contribuição Mensal</Text>
									<Text style={styles.valueHighlight}>R$ {dadosFinanceiros.valor_mensal}</Text>
								</View>
								<View style={{ flex: 1, alignItems: 'flex-end' }}>
									<Text style={styles.infoSubLabel}>Próximo Vencimento</Text>
									<Text style={styles.dateHighlight}>{dadosFinanceiros.proximo_vencimento}</Text>
								</View>
							</View>
						</View>

						<View style={styles.sectionContainer}>
							<Text style={styles.sectionTitle}>Mensalidades Pendentes</Text>

							{dadosFinanceiros.faturas.length === 0 ? (
								<View style={styles.emptyBox}>
									<Feather name="thumbs-up" size={36} color="#28a745" />
									<Text style={styles.emptyText}>Você não possui nenhuma mensalidade pendente!</Text>
								</View>
							) : (
								dadosFinanceiros.faturas.map((fatura) => (
									<View key={fatura.id} style={styles.faturaCard}>
										<View style={{ flex: 1 }}>
											<Text style={styles.faturaTitle}>{fatura.descricao}</Text>
											<Text style={styles.faturaDate}>Vencimento: {fatura.data_vencimento}</Text>
										</View>
										<View style={{ alignItems: 'flex-end' }}>
											<Text style={styles.faturaValor}>R$ {fatura.valor}</Text>
											<View style={[
												styles.faturaBadge,
												{ backgroundColor: fatura.situacao === 'Atrasado' ? '#FFEBEE' : fatura.situacao === 'Parcial' ? '#FFF8E1' : '#E3F2FD' }
											]}>
												<Text style={[
													styles.faturaBadgeText,
													{ color: fatura.situacao === 'Atrasado' ? '#ED1C24' : fatura.situacao === 'Parcial' ? '#F57F17' : '#1976D2' }
												]}>
													{fatura.situacao}
												</Text>
											</View>
										</View>
									</View>
								))
							)}

							{dadosFinanceiros.faturas.length > 0 && (
								<TouchableOpacity style={styles.btnPix} onPress={copiarChavePix} activeOpacity={0.8}>
									<Feather name="copy" size={20} color="#FFF" style={{ marginRight: 8 }} />
									<Text style={styles.btnPixText}>
										{pixCopiado ? "Chave PIX Copiada!" : "Copiar Chave PIX para Pagamento"}
									</Text>
								</TouchableOpacity>
							)}
						</View>

						<View style={styles.sectionContainer}>
							<Text style={styles.sectionTitle}>Histórico de Pagamentos</Text>

							{dadosFinanceiros.historico.length === 0 ? (
								<Text style={styles.noHistoryText}>Nenhum histórico registrado ainda.</Text>
							) : (
								dadosFinanceiros.historico.map((hist) => (
									<View key={hist.id} style={styles.historyRow}>
										<View style={styles.historyIcon}>
											<Feather name="check" size={18} color="#28a745" />
										</View>
										<View style={{ flex: 1, marginLeft: 12 }}>
											<Text style={styles.historyTitle}>{hist.descricao}</Text>
											<Text style={styles.historyDate}>Pago em {hist.data_pagamento}</Text>
										</View>
										<Text style={styles.historyValue}>R$ {hist.valor}</Text>
									</View>
								))
							)}
						</View>

						<View style={{ height: 40 }} />
					</>
				)}
			</ScrollView>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	content: { flex: 1, padding: 15 },

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

	statusCard: {
		backgroundColor: '#FFF',
		borderRadius: 16,
		padding: 20,
		marginBottom: 15,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
	},
	statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	statusLabel: { fontSize: 12, color: '#777', textTransform: 'uppercase', fontWeight: '600' },
	statusTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
	statusBadge: { padding: 10, borderRadius: 30 },

	divider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 15 },

	infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
	infoSubLabel: { fontSize: 11, color: '#777', fontWeight: 'bold' },
	valueHighlight: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA, marginTop: 4 },
	dateHighlight: { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 4 },

	sectionContainer: {
		backgroundColor: '#FFF',
		borderRadius: 16,
		padding: 20,
		marginBottom: 15,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
	},
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 15 },

	emptyBox: { alignItems: 'center', paddingVertical: 20 },
	emptyText: { color: '#28a745', fontWeight: 'bold', marginTop: 10, textAlign: 'center', fontSize: 14 },

	faturaCard: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F2F5'
	},
	faturaTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
	faturaDate: { fontSize: 12, color: '#777', marginTop: 2 },
	faturaValor: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA },
	faturaBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-end' },
	faturaBadgeText: { fontSize: 10, fontWeight: 'bold' },

	btnPix: {
		backgroundColor: COR_PRIMARIA,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		borderRadius: 10,
		marginTop: 15,
		elevation: 2
	},
	btnPixText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

	noHistoryText: { color: '#888', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
	historyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F2F5'
	},
	historyIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#E8F5E9',
		justifyContent: 'center',
		alignItems: 'center'
	},
	historyTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
	historyDate: { fontSize: 11, color: '#888', marginTop: 2 },
	historyValue: { fontSize: 14, fontWeight: 'bold', color: '#28a745' }
});