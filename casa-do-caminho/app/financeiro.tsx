import React, { useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Platform,
	Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F8F9FA';

export default function FinanceiroScreen() {
	const [pixCopiado, setPixCopiado] = useState(false);

	const chavePix = "00020126580014BR.GOV.BCB.PIX0136casadocaminho@org.br5204000053039865802BR5920Casa do Caminho6009Natal62070503***6304E2CA";

	const handleCopiarPix = () => {
		setPixCopiado(true);
		Alert.alert(
			"Chave PIX Copiada!",
			"A chave PIX foi copiada para a sua área de transferência. Abra o app do seu banco para realizar a contribuição.",
			[{ text: "OK" }]
		);

		setTimeout(() => {
			setPixCopiado(false);
		}, 3000);
	};

	return (
		<View style={styles.container}>
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Financeiro</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				<View style={styles.statusCard}>
					<View style={styles.statusHeader}>
						<Text style={styles.statusLabel}>Mensalidade de Associado</Text>
						<View style={styles.badgeSuccess}>
							<Text style={styles.badgeText}>EM DIA</Text>
						</View>
					</View>

					<Text style={styles.valueText}>R$ 50,00 <Text style={styles.perMonth}>/ mês</Text></Text>
					<Text style={styles.dueDateText}>Próximo vencimento: 10/08/2026</Text>

					<View style={styles.dividerLight} />

					<View style={styles.statusFooter}>
						<Ionicons name="shield-checkmark" size={18} color={COR_DETALHE} />
						<Text style={styles.statusFooterText}>Plano Mantenedor Ativo</Text>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Contribuição via PIX</Text>

					<View style={styles.pixCard}>
						<View style={styles.pixHeader}>
							<View style={styles.pixIconCircle}>
								<Ionicons name="qr-code" size={28} color={COR_PRIMARIA} />
							</View>
							<View style={styles.pixTextContent}>
								<Text style={styles.pixTitle}>PIX Copia e Cola</Text>
								<Text style={styles.pixSub}>Contribua com qualquer valor com praticidade</Text>
							</View>
						</View>

						<TouchableOpacity
							style={[styles.pixButton, pixCopiado && styles.pixButtonSuccess]}
							onPress={handleCopiarPix}
							activeOpacity={0.8}
						>
							<Ionicons
								name={pixCopiado ? "checkmark-circle" : "copy-outline"}
								size={20}
								color={COR_PRIMARIA}
								style={{ marginRight: 8 }}
							/>
							<Text style={styles.pixButtonText}>
								{pixCopiado ? "Chave Copiada!" : "Copiar Chave PIX"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Histórico de Recibos</Text>

					<View style={styles.historyCard}>
						<View style={styles.historyIcon}>
							<Ionicons name="checkmark-done-circle" size={24} color="#2E7D32" />
						</View>
						<View style={styles.historyInfo}>
							<Text style={styles.historyTitle}>Mensalidade Julho/2026</Text>
							<Text style={styles.historyDate}>Pago em 08/07/2026 • via PIX</Text>
						</View>
						<Text style={styles.historyValue}>R$ 50,00</Text>
					</View>

					<View style={styles.historyCard}>
						<View style={styles.historyIcon}>
							<Ionicons name="checkmark-done-circle" size={24} color="#2E7D32" />
						</View>
						<View style={styles.historyInfo}>
							<Text style={styles.historyTitle}>Mensalidade Junho/2026</Text>
							<Text style={styles.historyDate}>Pago em 09/06/2026 • via PIX</Text>
						</View>
						<Text style={styles.historyValue}>R$ 50,00</Text>
					</View>

					<View style={styles.historyCard}>
						<View style={styles.historyIcon}>
							<Ionicons name="heart-circle" size={24} color="#E67E22" />
						</View>
						<View style={styles.historyInfo}>
							<Text style={styles.historyTitle}>Doação Campanha do Agasalho</Text>
							<Text style={styles.historyDate}>Pago em 15/05/2026 • Extra</Text>
						</View>
						<Text style={styles.historyValue}>R$ 100,00</Text>
					</View>
				</View>

				<View style={{ height: 40 }} />
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COR_FUNDO,
	},
	headerBar: {
		backgroundColor: COR_PRIMARIA,
		paddingTop: Platform.OS === 'ios' ? 55 : 45,
		paddingBottom: 20,
		paddingHorizontal: 15,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomLeftRadius: 25,
		borderBottomRightRadius: 25,
		elevation: 5,
		zIndex: 10,
	},
	backButton: { padding: 5 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

	content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

	statusCard: {
		backgroundColor: COR_PRIMARIA,
		borderRadius: 20,
		padding: 20,
		marginBottom: 24,
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 5,
	},
	statusHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	statusLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
	badgeSuccess: {
		backgroundColor: '#2E7D32',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
	},
	badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
	valueText: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginTop: 12 },
	perMonth: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 'normal' },
	dueDateText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
	dividerLight: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 16 },
	statusFooter: { flexDirection: 'row', alignItems: 'center' },
	statusFooterText: { color: COR_DETALHE, fontSize: 13, fontWeight: 'bold', marginLeft: 8 },

	section: { marginBottom: 24 },
	sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 14 },

	pixCard: {
		backgroundColor: '#FFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		elevation: 2,
	},
	pixHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
	pixIconCircle: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: COR_DETALHE,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 14,
	},
	pixTextContent: { flex: 1 },
	pixTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
	pixSub: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
	pixButton: {
		backgroundColor: COR_DETALHE,
		height: 48,
		borderRadius: 12,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	pixButtonSuccess: {
		backgroundColor: '#A2F3A1',
	},
	pixButtonText: { color: COR_PRIMARIA, fontSize: 15, fontWeight: 'bold' },

	historyCard: {
		backgroundColor: '#FFF',
		borderRadius: 14,
		padding: 14,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#F0F2F5',
	},
	historyIcon: { marginRight: 12 },
	historyInfo: { flex: 1 },
	historyTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50' },
	historyDate: { fontSize: 12, color: '#95A5A6', marginTop: 2 },
	historyValue: { fontSize: 15, fontWeight: 'bold', color: COR_PRIMARIA },
});