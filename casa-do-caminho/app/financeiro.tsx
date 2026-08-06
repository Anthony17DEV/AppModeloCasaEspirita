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
		proximo_vencimento: '--/--/----',
		faturas: [] as any[],
		historico: [] as any[]
	});

	const carregarFinanceiro = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			if (!session) {
				router.replace('/');
				return;
			}
			const user = JSON.parse(session);
			const idFreq = user.id_frequentador || 0;
			const idUser = user.id || 0;

			const response = await apiService.api.get(`api_meu_financeiro.php?id_frequentador=${idFreq}&id_usuario=${idUser}`);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				setDadosFinanceiros(resData.data);
			}
		} catch (error) {
			Alert.alert("Erro", "Falha de conexão com o servidor.");
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregarFinanceiro();
		}, [])
	);

	const handleCopiarPix = () => {
		setPixCopiado(true);
		Alert.alert(
			"Chave PIX Copiada!",
			"A chave PIX da instituição foi copiada para a área de transferência. Use a opção 'PIX Copia e Cola' no app do seu banco.",
			[{ text: "OK" }]
		);
		setTimeout(() => setPixCopiado(false), 3000);
	};

	const handleLogout = () => {
		Alert.alert(
			"Sair da Conta",
			"Deseja realmente encerrar a sessão?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Sair", style: "destructive", onPress: async () => {
						await AsyncStorage.removeItem('@user_session');
						router.replace('/');
					}
				}
			]
		);
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Minhas Contribuições</Text>
				<TouchableOpacity style={styles.menuButton} onPress={handleLogout}>
					<Feather name="power" size={24} color={COR_PRIMARIA} />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>

				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 40 }} />
				) : (
					<>
						<View style={styles.sectionContainer}>
							<Text style={styles.sectionTitle}>Situação do Mantenedor</Text>

							<View style={styles.rowBetween}>
								<View>
									<Text style={styles.labelSub}>Valor da Contribuição</Text>
									<Text style={styles.valueHighlight}>R$ {dadosFinanceiros.valor_mensal} <Text style={{ fontSize: 13, color: '#666', fontWeight: 'normal' }}>/mês</Text></Text>
								</View>
								<View style={[
									styles.statusBadge,
									dadosFinanceiros.status === 'ATRASADO' ? { backgroundColor: '#FFEBEE' } : { backgroundColor: '#E8F5E9' }
								]}>
									<Text style={[
										styles.statusBadgeText,
										dadosFinanceiros.status === 'ATRASADO' ? { color: '#C62828' } : { color: '#2E7D32' }
									]}>
										{dadosFinanceiros.status}
									</Text>
								</View>
							</View>

							<Text style={{ fontSize: 13, color: '#666', marginTop: 10 }}>
								Próximo Vencimento: <Text style={{ fontWeight: 'bold', color: '#333' }}>{dadosFinanceiros.proximo_vencimento}</Text>
							</Text>
						</View>

						<View style={styles.sectionContainer}>
							<Text style={styles.sectionTitle}>Faturas Pendentes</Text>

							{dadosFinanceiros.faturas.length === 0 ? (
								<View style={{ paddingVertical: 10, alignItems: 'center' }}>
									<Feather name="check-circle" size={32} color="#28a745" />
									<Text style={{ color: '#666', marginTop: 8, fontSize: 13 }}>Você não possui faturas pendentes no momento!</Text>
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
												fatura.situacao === 'Atrasado' ? { backgroundColor: '#FFEBEE' } : { backgroundColor: '#FFF3E0' }
											]}>
												<Text style={[
													styles.faturaBadgeText,
													fatura.situacao === 'Atrasado' ? { color: '#C62828' } : { color: '#E65100' }
												]}>
													{fatura.situacao}
												</Text>
											</View>
										</View>
									</View>
								))
							)}
						</View>

						<View style={styles.sectionContainer}>
							<Text style={styles.sectionTitle}>Pagamento via PIX</Text>
							<Text style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>
								Copie a chave PIX abaixo para realizar a contribuição no aplicativo do seu banco:
							</Text>

							<TouchableOpacity
								style={[styles.btnPix, pixCopiado && { backgroundColor: '#28a745' }]}
								onPress={handleCopiarPix}
								activeOpacity={0.8}
							>
								<Ionicons name={pixCopiado ? "checkmark-circle" : "copy-outline"} size={20} color="#fff" style={{ marginRight: 8 }} />
								<Text style={styles.btnPixText}>
									{pixCopiado ? "Chave PIX Copiada!" : "Copiar Chave PIX (Copia e Cola)"}
								</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.sectionContainer}>
							<Text style={styles.sectionTitle}>Histórico de Recibos</Text>

							{dadosFinanceiros.historico.length === 0 ? (
								<Text style={{ color: '#888', textAlign: 'center', paddingVertical: 10 }}>
									Nenhum pagamento registrado no histórico.
								</Text>
							) : (
								dadosFinanceiros.historico.map((hist) => (
									<View key={hist.id} style={styles.historyRow}>
										<View style={styles.historyIconCircle}>
											<Ionicons name="receipt-outline" size={20} color={COR_PRIMARIA} />
										</View>
										<View style={{ flex: 1, marginLeft: 12 }}>
											<Text style={styles.historyTitle}>{hist.descricao}</Text>
											<Text style={styles.historyDate}>Pago em {hist.data_pagamento}</Text>
										</View>
										<Text style={styles.historyValor}>R$ {hist.valor}</Text>
									</View>
								))
							)}
						</View>
					</>
				)}

				<View style={{ height: 40 }} />
			</ScrollView>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	scrollContent: { flex: 1, backgroundColor: COR_FUNDO },

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

	sectionContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 15 },
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },

	rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	labelSub: { fontSize: 12, color: '#777', fontWeight: 'bold' },
	valueHighlight: { fontSize: 24, fontWeight: 'bold', color: COR_PRIMARIA, marginTop: 2 },

	statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
	statusBadgeText: { fontSize: 12, fontWeight: 'bold' },

	faturaCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
	faturaTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
	faturaDate: { fontSize: 12, color: '#777', marginTop: 2 },
	faturaValor: { fontSize: 15, fontWeight: 'bold', color: COR_PRIMARIA },
	faturaBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
	faturaBadgeText: { fontSize: 10, fontWeight: 'bold' },

	btnPix: { backgroundColor: COR_PRIMARIA, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, elevation: 2 },
	btnPixText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

	historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
	historyIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EBF4FC', justifyContent: 'center', alignItems: 'center' },
	historyTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
	historyDate: { fontSize: 11, color: '#888', marginTop: 2 },
	historyValor: { fontSize: 14, fontWeight: 'bold', color: '#28a745' }
});