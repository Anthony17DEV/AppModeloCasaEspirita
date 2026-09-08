import React, { useEffect, useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Platform,
	StatusBar,
	Alert,
	ActivityIndicator,
	KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiService } from '../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F4F6F8';

const PRINCIPIOS = [
	{
		titulo: 'O Estudo Sério e a Reforma Íntima',
		texto: 'Em O Livro dos Espíritos, aprendemos que o verdadeiro espírita se reconhece por sua transformação moral e pelos esforços que emprega para domar suas más inclinações. Desejo me associar para me engajar ainda mais profundamente no estudo contínuo e metódico da doutrina, contribuindo para o caráter de "escola da alma" que Kardec idealizou para as sociedades espíritas.',
	},
	{
		titulo: 'A Homogeneidade e a Comunhão de Pensamentos',
		texto: 'Em O Livro dos Médiuns (Cap. XXIX), Kardec nos alerta que uma reunião espírita séria exige recolhimento e a comunhão de pensamentos simpáticos. Ao me tornar associado, busco integrar-me de forma mais consciente à egrégora desta Casa, unindo minhas vibrações e intenções às dos demais trabalhadores para fortalecer a sintonia com os Bons Espíritos que nos assistem.',
	},
	{
		titulo: 'A Prática da Caridade e a Manutenção da Casa',
		texto: 'O lema “Fora da caridade não há salvação” se aplica também ao cuidado com a própria instituição que nos acolhe. Entendo que o Centro Espírita, inserido no mundo material, possui necessidades estruturais e administrativas para manter suas portas abertas ao próximo. Como associado, desejo contribuir com minha cota de esforço – seja moral, intelectual ou material – para a sustentação das atividades caritativas e doutrinárias que aqui são realizadas.',
	},
];

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	try {
		return JSON.parse(String(resposta || '').trim());
	} catch (e) {
		return null;
	}
};

export default function TermoAssociacaoScreen() {
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [usuario, setUsuario] = useState<any>(null);
	const [status, setStatus] = useState<any>(null);
	const [valorContribuicao, setValorContribuicao] = useState('');
	const [diaVencimento, setDiaVencimento] = useState('');

	const carregar = async () => {
		setIsLoading(true);

		try {
			const session = await AsyncStorage.getItem('@user_session');

			if (!session) {
				router.replace('/');
				return;
			}

			const user = JSON.parse(session);
			setUsuario(user);

			const response = await apiService.api.get(
				`api_status_associacao.php?id_usuario=${encodeURIComponent(String(user.id || user.id_usuario || 0))}&id_frequentador=${encodeURIComponent(String(user.id_frequentador || 0))}&codigo_casa=${encodeURIComponent(String(user.codigo_casa || ''))}`
			);

			const resData = parseJSONSeguro(response.data);

			if (!resData?.success) {
				Alert.alert('Erro', resData?.message || 'Não foi possível carregar os dados da associação.');
				router.back();
				return;
			}

			setStatus(resData.data);

			if (resData.data?.ja_associado) {
				Alert.alert('Associação', 'Seu cadastro já está como associado.');
				router.replace('/associado');
				return;
			}

			if (resData.data?.tem_solicitacao_pendente) {
				Alert.alert('Associação', 'Você já possui uma solicitação aguardando análise da diretoria.');
				router.replace('/associado');
				return;
			}
		} catch (error) {
			console.log('[TERMO ASSOCIACAO] Erro:', error);
			Alert.alert('Erro', 'Não foi possível comunicar com o servidor.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		carregar();
	}, []);

	const confirmar = () => {
		const valorLimpo = String(valorContribuicao || '').trim();
		const dia = Number(String(diaVencimento || '').replace(/\D/g, ''));

		if (!valorLimpo) {
			Alert.alert('Atenção', 'Informe o valor da contribuição.');
			return;
		}

		if (!dia || dia < 1 || dia > 31) {
			Alert.alert('Atenção', 'Informe um dia de vencimento entre 1 e 31.');
			return;
		}

		Alert.alert(
			'Confirmar associação',
			`Deseja enviar sua solicitação para a diretoria?\n\nContribuição: R$ ${valorLimpo}\nVencimento: dia ${dia}`,
			[
				{ text: 'Cancelar', style: 'cancel' },
				{
					text: 'Confirmar',
					onPress: async () => {
						setIsSaving(true);

						try {
							const payload = {
								id_usuario: usuario?.id || usuario?.id_usuario || 0,
								id_frequentador: usuario?.id_frequentador || 0,
								valor_contribuicao: valorLimpo,
								dia_vencimento: dia,
							};

							const response = await apiService.api.post('api_solicitar_associacao.php', payload);
							const resData = parseJSONSeguro(response.data);

							if (resData?.success) {
								Alert.alert(
									'Solicitação enviada',
									'Sua solicitação foi encaminhada para a diretoria. Você será avisado após a análise.',
									[
										{
											text: 'Entendido',
											onPress: () => router.replace('/associado'),
										},
									]
								);
							} else {
								Alert.alert('Erro', resData?.message || 'Não foi possível enviar a solicitação.');
							}
						} catch (error: any) {
							console.log('[TERMO ASSOCIACAO] Erro ao enviar:', error?.message || error);

							try {
								const statusResponse = await apiService.api.get(
									`api_status_associacao.php?id_usuario=${encodeURIComponent(String(usuario?.id || usuario?.id_usuario || 0))}&id_frequentador=${encodeURIComponent(String(usuario?.id_frequentador || 0))}&codigo_casa=${encodeURIComponent(String(usuario?.codigo_casa || ''))}`
								);

								const statusData = parseJSONSeguro(statusResponse.data);

								if (statusData?.success && statusData?.data?.tem_solicitacao_pendente) {
									Alert.alert(
										'Solicitação enviada',
										'Sua solicitação foi registrada e está aguardando análise da diretoria.',
										[
											{
												text: 'Entendido',
												onPress: () => router.replace('/associado'),
											},
										]
									);
									return;
								}
							} catch (statusError) {
								console.log('[TERMO ASSOCIACAO] Falha ao confirmar status após erro:', statusError);
							}

							Alert.alert(
								'Erro',
								error?.response?.data?.message ||
								error?.message ||
								'Não foi possível comunicar com o servidor.'
							);
						} finally {
							setIsSaving(false);
						}
					},
				},
			]
		);
	};

	if (isLoading) {
		return (
			<View style={[styles.container, styles.loadingContainer]}>
				<ActivityIndicator size="large" color={COR_PRIMARIA} />
				<Text style={styles.loadingText}>Carregando termo...</Text>
			</View>
		);
	}

	const casaNome = status?.casa_nome || 'Centro Espírita';

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={27} color="#FFF" />
				</TouchableOpacity>

				<Text style={styles.headerBarTitle}>Termo de Associação</Text>

				<View style={{ width: 47 }} />
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.termCard}>
						<Text style={styles.destinatario}>À Diretoria do {casaNome},</Text>

						<Text style={styles.paragrafo}>
							Por meio desta, expresso meu sincero desejo de me tornar um associado desta Casa, estreitando os laços que já me unem a este grupo de trabalho e estudo.
						</Text>

						<Text style={styles.paragrafo}>
							Como frequentador, tenho encontrado neste ambiente o amparo e a instrução necessários para o meu despertar espiritual. No entanto, fundamentado nos ensinamentos do Codificador Allan Kardec, compreendo que o Espiritismo nos convida a dar um passo além da assistência passiva, chamando-nos à responsabilidade do compromisso ativo.
						</Text>

						<Text style={styles.paragrafo}>
							Minha decisão de me associar baseia-se nos seguintes princípios da Doutrina Espírita:
						</Text>

						{PRINCIPIOS.map((item, index) => (
							<View key={index} style={styles.principio}>
								<Text style={styles.principioTitulo}>{item.titulo}:</Text>
								<Text style={styles.paragrafoSemMargem}>{item.texto}</Text>
							</View>
						))}

						<Text style={styles.paragrafo}>
							Sinto que este é o momento de retribuir o bem que tenho recebido, colocando-me à disposição para servir, aprender e somar esforços na vivência do Evangelho de Jesus à luz da Doutrina Espírita.
						</Text>

						<Text style={styles.paragrafo}>
							Agradeço a acolhida fraterna de sempre e submeto este pedido à apreciação da diretoria.
						</Text>

						<Text style={styles.assinatura}>Com votos de muita paz,</Text>
					</View>

					<View style={styles.formCard}>
						<Text style={styles.formTitle}>Dados da contribuição</Text>
						<Text style={styles.formSub}>
							Esses dados somente serão efetivados após a aprovação da diretoria.
						</Text>

						<Text style={styles.label}>Valor da contribuição</Text>
						<View style={styles.moneyRow}>
							<Text style={styles.moneyPrefix}>R$</Text>
							<TextInput
								style={styles.moneyInput}
								placeholder="Ex.: 50,00"
								placeholderTextColor="#9AA0A6"
								keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
								value={valorContribuicao}
								onChangeText={setValorContribuicao}
							/>
						</View>

						<Text style={styles.label}>Melhor dia de vencimento</Text>
						<TextInput
							style={styles.input}
							placeholder="Ex.: 10"
							placeholderTextColor="#9AA0A6"
							keyboardType="numeric"
							maxLength={2}
							value={diaVencimento}
							onChangeText={(text) => setDiaVencimento(text.replace(/\D/g, ''))}
						/>

						<View style={styles.regraBox}>
							<Ionicons name="information-circle-outline" size={21} color={COR_PRIMARIA} />
							<Text style={styles.regraText}>
								Após a aprovação, a primeira mensalidade será o próximo vencimento futuro conforme o dia escolhido.
							</Text>
						</View>

						<TouchableOpacity
							style={[styles.btnConfirmar, isSaving && { opacity: 0.6 }]}
							onPress={confirmar}
							disabled={isSaving}
						>
							{isSaving ? (
								<ActivityIndicator color="#FFF" />
							) : (
								<>
									<Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
									<Text style={styles.btnConfirmarText}>CONFIRMAR ASSOCIAÇÃO</Text>
								</>
							)}
						</TouchableOpacity>
					</View>

					<View style={{ height: 45 }} />
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	loadingContainer: { justifyContent: 'center', alignItems: 'center' },
	loadingText: { color: '#666', marginTop: 12 },

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
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

	scroll: { flex: 1 },
	scrollContent: { padding: 16 },

	termCard: {
		backgroundColor: '#FFF',
		borderRadius: 15,
		padding: 20,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	destinatario: {
		color: COR_PRIMARIA,
		fontSize: 17,
		fontWeight: 'bold',
		marginBottom: 18,
	},
	paragrafo: {
		color: '#36454F',
		fontSize: 14,
		lineHeight: 23,
		textAlign: 'justify',
		marginBottom: 16,
	},
	paragrafoSemMargem: {
		color: '#36454F',
		fontSize: 14,
		lineHeight: 23,
		textAlign: 'justify',
	},
	principio: {
		backgroundColor: '#F8F9FC',
		borderLeftWidth: 4,
		borderLeftColor: COR_PRIMARIA,
		padding: 14,
		borderRadius: 8,
		marginBottom: 14,
	},
	principioTitulo: {
		color: COR_PRIMARIA,
		fontWeight: 'bold',
		fontSize: 14,
		marginBottom: 7,
	},
	assinatura: {
		fontSize: 15,
		color: '#36454F',
		fontStyle: 'italic',
		marginTop: 4,
	},

	formCard: {
		backgroundColor: '#FFF',
		borderRadius: 15,
		padding: 20,
		marginTop: 18,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	formTitle: { fontSize: 18, color: COR_PRIMARIA, fontWeight: 'bold' },
	formSub: { fontSize: 12, color: '#777', lineHeight: 18, marginTop: 5, marginBottom: 18 },
	label: { fontSize: 13, color: '#444', fontWeight: 'bold', marginBottom: 6, marginTop: 4 },
	input: {
		backgroundColor: '#F9F9F9',
		borderWidth: 1,
		borderColor: '#D8DDE3',
		borderRadius: 10,
		paddingHorizontal: 14,
		minHeight: 50,
		fontSize: 16,
		color: '#222',
		marginBottom: 16,
	},
	moneyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F9F9F9',
		borderWidth: 1,
		borderColor: '#D8DDE3',
		borderRadius: 10,
		minHeight: 50,
		marginBottom: 16,
	},
	moneyPrefix: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA, marginLeft: 14 },
	moneyInput: { flex: 1, paddingHorizontal: 10, minHeight: 50, fontSize: 16, color: '#222' },

	regraBox: {
		backgroundColor: '#EEF2FF',
		borderRadius: 10,
		padding: 12,
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 18,
	},
	regraText: { flex: 1, marginLeft: 9, color: '#4C567B', fontSize: 12, lineHeight: 18 },

	btnConfirmar: {
		backgroundColor: '#28A745',
		borderRadius: 13,
		minHeight: 56,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 3,
	},
	btnConfirmarText: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
});
