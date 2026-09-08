import React, { useEffect, useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Platform,
	StatusBar,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MenuLateral from '@/components/MenuLateral';
import { apiService } from '../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F4F6F8';

const TEXTO_ASSOCIACAO = `Kardec defendia que todo trabalho espiritual deve ser rigorosamente gratuito (dar de graça o que de graça recebestes), é por isso que durante as reuniões e palestras não tratamos sobre contribuições a Casa. No entanto, ele também compreendia que as Casas ou Sociedades Espíritas funcionam no mundo material e possuem despesas (luz, água, aluguel, manutenção). Portanto, a Casa deve ser sustentada pelas contribuições financeiras e voluntárias de seus associados, formando um fundo coletivo para manter a estrutura física e as obras de caridade, sem visar lucros.

Se você voluntariamente sente que este é o momento de retribuir o bem que tenho recebido, colocando-se à disposição para servir, aprender e somar esforços na vivência do Evangelho de Jesus à luz da Doutrina Espírita, torne-se associado da Casa.`;

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	try {
		return JSON.parse(String(resposta || '').trim());
	} catch (e) {
		return null;
	}
};

export default function AssociadoScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [status, setStatus] = useState<any>(null);

	const carregarStatus = async () => {
		setIsLoading(true);

		try {
			const session = await AsyncStorage.getItem('@user_session');

			if (!session) {
				router.replace('/');
				return;
			}

			const user = JSON.parse(session);
			const idUsuario = user.id || user.id_usuario || 0;
			const idFrequentador = user.id_frequentador || 0;
			const codigoCasa = user.codigo_casa || '';

			const response = await apiService.api.get(
				`api_status_associacao.php?id_usuario=${encodeURIComponent(String(idUsuario))}&id_frequentador=${encodeURIComponent(String(idFrequentador))}&codigo_casa=${encodeURIComponent(String(codigoCasa))}`
			);

			const resData = parseJSONSeguro(response.data);

			if (resData?.success) {
				setStatus(resData.data);

				if (String(resData.data?.tipo || '').toUpperCase() === 'ASSOCIADO' && user.nivel_acesso !== 'ASSOCIADO') {
					const novaSessao = { ...user, nivel_acesso: 'ASSOCIADO' };
					await AsyncStorage.setItem('@user_session', JSON.stringify(novaSessao));
				}
			} else {
				setStatus(null);
			}
		} catch (error) {
			console.log('[ASSOCIACAO] Erro ao consultar status:', error);
			setStatus(null);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		carregarStatus();
	}, []);

	const abrirTermo = () => {
		router.push('/termo-associacao');
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>

				<Text style={styles.headerBarTitle}>Associação</Text>

				<TouchableOpacity style={styles.menuButton} onPress={carregarStatus}>
					<Ionicons name="refresh" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scrollContent}
				contentContainerStyle={styles.scrollContentContainer}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.hero}>
					<View style={styles.heroIcon}>
						<Ionicons name="heart-outline" size={38} color={COR_PRIMARIA} />
					</View>
					<Text style={styles.heroTitle}>Torne-se associado da Casa</Text>
					<Text style={styles.heroSub}>
						Um compromisso voluntário com a manutenção e continuidade das atividades da instituição.
					</Text>
				</View>

				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginVertical: 25 }} />
				) : (
					<>
						{status?.ja_associado && (
							<View style={styles.statusAprovado}>
								<Ionicons name="checkmark-circle" size={28} color="#2E7D32" />
								<View style={{ flex: 1, marginLeft: 12 }}>
									<Text style={styles.statusAprovadoTitle}>Você já é associado</Text>
									<Text style={styles.statusAprovadoText}>
										Seu cadastro já foi confirmado pela diretoria.
									</Text>
								</View>
							</View>
						)}

						{!status?.ja_associado && status?.tem_solicitacao_pendente && (
							<View style={styles.statusPendente}>
								<Ionicons name="time-outline" size={28} color="#A66500" />
								<View style={{ flex: 1, marginLeft: 12 }}>
									<Text style={styles.statusPendenteTitle}>Solicitação em análise</Text>
									<Text style={styles.statusPendenteText}>
										Enviada em {status?.solicitacao?.data_solicitacao || '-'}
									</Text>
									<Text style={styles.statusPendenteText}>
										Contribuição: R$ {status?.solicitacao?.valor_contribuicao || '0,00'} • vencimento dia {status?.solicitacao?.dia_vencimento || '-'}
									</Text>
									<Text style={[styles.statusPendenteText, { marginTop: 6 }]}>
										A associação será efetivada somente após a confirmação da diretoria.
									</Text>
								</View>
							</View>
						)}

						<View style={styles.textCard}>
							<Text style={styles.textoPrincipal}>{TEXTO_ASSOCIACAO}</Text>
						</View>

						{!status?.ja_associado && !status?.tem_solicitacao_pendente && (
							<TouchableOpacity style={styles.btnAssociar} onPress={abrirTermo} activeOpacity={0.85}>
								<Ionicons name="people-outline" size={21} color="#FFF" />
								<Text style={styles.btnAssociarText}>TORNE-SE ASSOCIADO</Text>
							</TouchableOpacity>
						)}
					</>
				)}

				<View style={{ height: 45 }} />
			</ScrollView>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },

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

	scrollContent: { flex: 1 },
	scrollContentContainer: { padding: 18 },

	hero: {
		backgroundColor: COR_PRIMARIA,
		borderRadius: 18,
		padding: 22,
		alignItems: 'center',
		marginBottom: 18,
	},
	heroIcon: {
		width: 70,
		height: 70,
		borderRadius: 35,
		backgroundColor: COR_DETALHE,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 14,
	},
	heroTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
	heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 8 },

	textCard: {
		backgroundColor: '#FFF',
		borderRadius: 15,
		padding: 20,
		borderWidth: 1,
		borderColor: '#E1E4E8',
		elevation: 2,
	},
	textoPrincipal: {
		fontSize: 15,
		color: '#36454F',
		lineHeight: 24,
		textAlign: 'justify',
	},

	statusPendente: {
		backgroundColor: '#FFF6E6',
		borderWidth: 1,
		borderColor: '#E5B45B',
		borderRadius: 14,
		padding: 16,
		flexDirection: 'row',
		marginBottom: 16,
	},
	statusPendenteTitle: { color: '#8A5700', fontWeight: 'bold', fontSize: 16 },
	statusPendenteText: { color: '#6E5A35', fontSize: 13, lineHeight: 18, marginTop: 2 },

	statusAprovado: {
		backgroundColor: '#EEF8F0',
		borderWidth: 1,
		borderColor: '#A8D5B0',
		borderRadius: 14,
		padding: 16,
		flexDirection: 'row',
		marginBottom: 16,
	},
	statusAprovadoTitle: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
	statusAprovadoText: { color: '#4C6851', fontSize: 13, marginTop: 2 },

	btnAssociar: {
		backgroundColor: '#28A745',
		borderRadius: 14,
		minHeight: 56,
		marginTop: 20,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		elevation: 3,
		paddingHorizontal: 18,
	},
	btnAssociarText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: 'bold',
		marginLeft: 9,
		letterSpacing: 0.4,
	},
});
