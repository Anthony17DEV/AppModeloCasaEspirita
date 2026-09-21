import React, { useEffect, useMemo, useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Platform,
	Alert,
	Switch,
	ActivityIndicator,
	StatusBar,
	Modal,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MenuLateral from '@/components/MenuLateral';
import { apiService } from '../src/services/apiService';
import {
	TERMO_VOLUNTARIO_TITULO,
	TERMO_VOLUNTARIO_PREAMBULO,
	TERMO_VOLUNTARIO_CLAUSULAS,
	TERMO_VOLUNTARIO_VERSAO,
	personalizarTermoVoluntario,
} from './termoVoluntarioConteudo';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F4F6F8';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;

	const texto = String(resposta || '').trim();

	try {
		return JSON.parse(texto);
	} catch (e) { }

	try {
		const inicio = texto.indexOf('{');
		const fim = texto.lastIndexOf('}');
		if (inicio !== -1 && fim > inicio) {
			return JSON.parse(texto.substring(inicio, fim + 1));
		}
	} catch (e) { }

	return null;
};

export default function VoluntarioScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [aceitouTermos, setAceitouTermos] = useState(false);
	const [modalAceitesVisivel, setModalAceitesVisivel] = useState(false);
	const [aceitesFinais, setAceitesFinais] = useState({
		servicoVoluntario: false,
		normasSigilo: false,
		tratamentoDados: false,
		imagemVoz: false,
	});
	const [usuario, setUsuario] = useState<any>(null);
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
			setUsuario(user);

			const response = await apiService.api.get(
				`api_status_voluntariado.php?id_usuario=${encodeURIComponent(String(user.id || user.id_usuario || 0))}&id_frequentador=${encodeURIComponent(String(user.id_frequentador || 0))}&cpf=${encodeURIComponent(String(user.cpf || ''))}&codigo_casa=${encodeURIComponent(String(user.codigo_casa || ''))}`
			);

			const resData = parseJSONSeguro(response.data);

			if (resData?.success) {
				setStatus(resData.data);

				if (resData.data?.ja_voluntario || resData.data?.tem_solicitacao_pendente) {
					setAceitouTermos(true);
				}

				if (
					String(resData.data?.tipo_atual || '').toUpperCase() === 'VOLUNTÁRIO' &&
					String(user.nivel_acesso || '').toUpperCase() === 'FREQUENTADOR'
				) {
					await AsyncStorage.setItem(
						'@user_session',
						JSON.stringify({ ...user, nivel_acesso: 'VOLUNTÁRIO' })
					);
				}
			} else {
				setStatus(null);

				if (String(user.nivel_acesso || '').toUpperCase() !== 'ADMINISTRADOR') {
					Alert.alert('Erro', resData?.message || 'Não foi possível consultar o voluntariado.');
				}
			}
		} catch (error) {
			console.log('[VOLUNTARIADO] Erro ao consultar status:', error);
			setStatus(null);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		carregarStatus();
	}, []);

	const tituloStatus = useMemo(() => {
		if (status?.ja_voluntario) return 'Voluntariado Aprovado';
		if (status?.tem_solicitacao_pendente) return 'Solicitação em Análise';
		if (status?.termo_expirado) return 'Termo Expirado';
		if (status?.termo_anterior) return 'Novo Termo Disponível';
		return 'Aguardando Aceite';
	}, [status]);

	const todosAceitesFinais =
		aceitesFinais.servicoVoluntario &&
		aceitesFinais.normasSigilo &&
		aceitesFinais.tratamentoDados &&
		aceitesFinais.imagemVoz;

	const enviarSolicitacao = () => {
		if (!aceitouTermos) {
			Alert.alert('Atenção', 'Você precisa ler e aceitar o termo antes de prosseguir.');
			return;
		}

		setAceitesFinais({
			servicoVoluntario: false,
			normasSigilo: false,
			tratamentoDados: false,
			imagemVoz: false,
		});
		setModalAceitesVisivel(true);
	};

	const confirmarSolicitacao = () => {
		if (!todosAceitesFinais) {
			Alert.alert('Atenção', 'Confirme os quatro aceites finais para continuar.');
			return;
		}

		Alert.alert(
			'Confirmar voluntariado',
			'Ao confirmar, seu aceite eletrônico será registrado e a solicitação será encaminhada para análise da diretoria.',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{
					text: 'Confirmar',
					onPress: async () => {
						setIsSaving(true);

						try {
							const response = await apiService.api.post(
								'api_solicitar_voluntariado.php',
								{
									id_usuario: usuario?.id || usuario?.id_usuario || 0,
									id_frequentador: usuario?.id_frequentador || 0,
									aceitou: true,
									aceite_servico_voluntario: true,
									aceite_normas_sigilo: true,
									aceite_tratamento_dados: true,
									aceite_imagem_voz: true,
									termo_versao: TERMO_VOLUNTARIO_VERSAO,
								}
							);

							const resData = parseJSONSeguro(response.data);

							if (resData?.success) {
								setModalAceitesVisivel(false);
								Alert.alert(
									'Solicitação enviada',
									'Seus cinco aceites foram registrados e a solicitação foi encaminhada para a diretoria.',
									[{ text: 'Entendido', onPress: carregarStatus }]
								);
							} else {
								Alert.alert('Erro', resData?.message || 'Não foi possível enviar a solicitação.');
							}
						} catch (error: any) {
							console.log('[VOLUNTARIADO] Erro ao enviar:', error?.message || error);

							try {
								const statusResponse = await apiService.api.get(
									`api_status_voluntariado.php?id_usuario=${encodeURIComponent(String(usuario?.id || usuario?.id_usuario || 0))}&id_frequentador=${encodeURIComponent(String(usuario?.id_frequentador || 0))}&cpf=${encodeURIComponent(String(usuario?.cpf || ''))}&codigo_casa=${encodeURIComponent(String(usuario?.codigo_casa || ''))}`
								);

								const statusData = parseJSONSeguro(statusResponse.data);

								if (
									statusData?.success &&
									(statusData?.data?.tem_solicitacao_pendente || statusData?.data?.ja_voluntario)
								) {
									setModalAceitesVisivel(false);
									Alert.alert(
										'Solicitação registrada',
										'Seus aceites foram registrados e a solicitação está aguardando análise da diretoria.',
										[{ text: 'Entendido', onPress: carregarStatus }]
									);
									return;
								}
							} catch (statusError) {
								console.log('[VOLUNTARIADO] Falha ao confirmar status:', statusError);
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

	const statusColor = status?.ja_voluntario
		? '#2E7D32'
		: status?.tem_solicitacao_pendente || status?.termo_expirado || status?.termo_anterior
			? '#A66500'
			: '#FFF';

	const statusTextColor =
		status?.ja_voluntario ||
			status?.tem_solicitacao_pendente ||
			status?.termo_expirado ||
			status?.termo_anterior
			? '#FFF'
			: '#2C3E50';

	const podeSolicitar =
		!status?.ja_voluntario &&
		!status?.tem_solicitacao_pendente;

	const instituicaoNome =
		status?.instituicao?.nome ||
		status?.instituicao_nome ||
		'InstituiÃ§Ã£o';

	const instituicaoCnpj =
		status?.instituicao?.cnpj ||
		status?.instituicao_cnpj ||
		'';

	const instituicaoCidade =
		status?.instituicao?.cidade ||
		status?.instituicao_cidade ||
		'';

	const preambuloPersonalizado = personalizarTermoVoluntario(
		TERMO_VOLUNTARIO_PREAMBULO,
		instituicaoNome,
		instituicaoCnpj,
		instituicaoCidade
	);

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>

				<Text style={styles.headerBarTitle}>Termo de VoluntÃ¡rio</Text>

				<TouchableOpacity style={styles.menuButton} onPress={carregarStatus}>
					<Ionicons name="refresh" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.contentContainer}
				showsVerticalScrollIndicator={false}
			>
				{isLoading ? (
					<View style={styles.loadingArea}>
						<ActivityIndicator size="large" color={COR_PRIMARIA} />
						<Text style={styles.loadingText}>Carregando situação do voluntariado...</Text>
					</View>
				) : (
					<>
						<View style={[styles.statusCard, { backgroundColor: statusColor }]}>
							<Ionicons
								name={
									status?.ja_voluntario
										? 'checkmark-circle'
										: status?.tem_solicitacao_pendente
											? 'time-outline'
											: status?.termo_expirado || status?.termo_anterior
												? 'alert-circle'
												: 'document-text-outline'
								}
								size={32}
								color={
									status?.ja_voluntario ||
										status?.tem_solicitacao_pendente ||
										status?.termo_expirado ||
										status?.termo_anterior
										? '#FFF'
										: COR_DETALHE
								}
							/>

							<View style={styles.statusTextContainer}>
								<Text style={[styles.statusTitle, { color: statusTextColor }]}>
									{tituloStatus}
								</Text>

								<Text style={[
									styles.statusSub,
									{ color: statusTextColor === '#FFF' ? 'rgba(255,255,255,0.85)' : '#7F8C8D' },
								]}>
									{status?.ja_voluntario
										? `Termo aceito em ${status?.voluntario?.data_aceite || '-'} • válido até ${status?.voluntario?.validade || '-'}`
										: status?.tem_solicitacao_pendente
											? `Solicitado em ${status?.solicitacao?.data_solicitacao || '-'} • aguardando confirmação da diretoria`
											: status?.termo_expirado
												? `Última validade: ${status?.voluntario?.validade || '-'} • é necessário renovar`
												: status?.termo_anterior
													? 'Existe um termo anterior. O novo documento oficial precisa ser aceito.'
													: 'Leia o documento e envie seu compromisso para análise da diretoria.'}
								</Text>
							</View>
						</View>

						<View style={styles.voluntarioCard}>
							<View style={styles.voluntarioIcon}>
								<Feather name="user" size={22} color={COR_PRIMARIA} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.voluntarioLabel}>TRABALHADOR VOLUNTÁRIO</Text>
								<Text style={styles.voluntarioNome}>{status?.nome || usuario?.nome || 'Frequentador'}</Text>
							</View>
						</View>

						<View style={styles.termHeader}>
							<Text style={styles.documentTitle}>{TERMO_VOLUNTARIO_TITULO}</Text>
							<Text style={styles.documentHint}>
								Documento de voluntariado da instituição vinculada ao seu cadastro.
							</Text>
						</View>

						<View style={styles.textContainer}>
							<Text style={styles.preambulo}>{preambuloPersonalizado}</Text>

							{TERMO_VOLUNTARIO_CLAUSULAS.map((clausula, index) => (
								<View key={index} style={styles.clausula}>
									<Text style={styles.clausulaTitulo}>{clausula.titulo}</Text>
									<Text style={styles.legalText}>
										{personalizarTermoVoluntario(
											clausula.texto,
											instituicaoNome,
											instituicaoCnpj,
											instituicaoCidade
										)}
									</Text>
								</View>
							))}
						</View>

						<View style={styles.acceptanceArea}>
							<View style={styles.switchRow}>
								<Switch
									trackColor={{ false: '#767577', true: COR_PRIMARIA }}
									thumbColor={aceitouTermos ? COR_DETALHE : '#f4f3f4'}
									onValueChange={setAceitouTermos}
									value={aceitouTermos}
									disabled={!podeSolicitar}
								/>

								<Text style={styles.switchLabel}>
									Li integralmente e concordo com o Termo de Adesão ao Serviço Voluntário e com as autorizações nele previstas.
								</Text>
							</View>

							{podeSolicitar && (
								<TouchableOpacity
									style={[
										styles.btnSign,
										(!aceitouTermos || isSaving) && styles.btnDisabled,
									]}
									onPress={enviarSolicitacao}
									disabled={!aceitouTermos || isSaving}
								>
									{isSaving ? (
										<ActivityIndicator color="#FFF" />
									) : (
										<>
											<Ionicons name="hand-left-outline" size={21} color="#FFF" />
											<Text style={styles.btnSignText}>
												{status?.termo_expirado || status?.termo_anterior
													? 'RENOVAR SOLICITAÇÃO DE VOLUNTARIADO'
													: 'ENVIAR SOLICITAÇÃO DE VOLUNTARIADO'}
											</Text>
										</>
									)}
								</TouchableOpacity>
							)}

							{status?.tem_solicitacao_pendente && (
								<View style={styles.pendingInfo}>
									<Ionicons name="hourglass-outline" size={22} color="#A66500" />
									<Text style={styles.pendingInfoText}>
										Seu aceite já foi registrado. A ativação como voluntário acontecerá somente após a aprovação da diretoria.
									</Text>
								</View>
							)}

							{status?.ja_voluntario && (
								<View style={styles.approvedInfo}>
									<Ionicons name="shield-checkmark" size={23} color="#2E7D32" />
									<Text style={styles.approvedInfoText}>
										Seu cadastro está ativo como voluntário.
									</Text>
								</View>
							)}
						</View>

						<View style={{ height: 45 }} />
					</>
				)}
			</ScrollView>

			<Modal
				visible={modalAceitesVisivel}
				transparent
				animationType="fade"
				onRequestClose={() => !isSaving && setModalAceitesVisivel(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalAceites}>
						<View style={styles.modalHeader}>
							<View style={{ flex: 1 }}>
								<Text style={styles.modalTitle}>Confirmações finais</Text>
								<Text style={styles.modalSubtitle}>
									Para concluir a solicitação, confirme individualmente os quatro pontos abaixo.
								</Text>
							</View>

							<TouchableOpacity
								onPress={() => !isSaving && setModalAceitesVisivel(false)}
								disabled={isSaving}
							>
								<Ionicons name="close" size={26} color="#555" />
							</TouchableOpacity>
						</View>

						<View style={styles.aceiteFinalItem}>
							<Switch
								value={aceitesFinais.servicoVoluntario}
								onValueChange={(value) =>
									setAceitesFinais((atual) => ({ ...atual, servicoVoluntario: value }))
								}
								trackColor={{ false: '#767577', true: COR_PRIMARIA }}
								thumbColor={aceitesFinais.servicoVoluntario ? COR_DETALHE : '#f4f3f4'}
							/>
							<Text style={styles.aceiteFinalText}>
								Confirmo que o serviço é voluntário, gratuito e não gera vínculo empregatício ou obrigação remuneratória.
							</Text>
						</View>

						<View style={styles.aceiteFinalItem}>
							<Switch
								value={aceitesFinais.normasSigilo}
								onValueChange={(value) =>
									setAceitesFinais((atual) => ({ ...atual, normasSigilo: value }))
								}
								trackColor={{ false: '#767577', true: COR_PRIMARIA }}
								thumbColor={aceitesFinais.normasSigilo ? COR_DETALHE : '#f4f3f4'}
							/>
							<Text style={styles.aceiteFinalText}>
								Declaro ciência das normas da instituição e assumo o compromisso de sigilo e confidencialidade.
							</Text>
						</View>

						<View style={styles.aceiteFinalItem}>
							<Switch
								value={aceitesFinais.tratamentoDados}
								onValueChange={(value) =>
									setAceitesFinais((atual) => ({ ...atual, tratamentoDados: value }))
								}
								trackColor={{ false: '#767577', true: COR_PRIMARIA }}
								thumbColor={aceitesFinais.tratamentoDados ? COR_DETALHE : '#f4f3f4'}
							/>
							<Text style={styles.aceiteFinalText}>
								Autorizo o tratamento e armazenamento dos meus dados para a gestão do voluntariado, nos limites previstos no termo.
							</Text>
						</View>

						<View style={styles.aceiteFinalItem}>
							<Switch
								value={aceitesFinais.imagemVoz}
								onValueChange={(value) =>
									setAceitesFinais((atual) => ({ ...atual, imagemVoz: value }))
								}
								trackColor={{ false: '#767577', true: COR_PRIMARIA }}
								thumbColor={aceitesFinais.imagemVoz ? COR_DETALHE : '#f4f3f4'}
							/>
							<Text style={styles.aceiteFinalText}>
								Autorizo o uso de imagem, voz, fotografia e performance conforme as condições descritas no termo.
							</Text>
						</View>

						<TouchableOpacity
							style={[
								styles.btnSign,
								(!todosAceitesFinais || isSaving) && styles.btnDisabled,
							]}
							onPress={confirmarSolicitacao}
							disabled={!todosAceitesFinais || isSaving}
						>
							{isSaving ? (
								<ActivityIndicator color="#FFF" />
							) : (
								<>
									<Ionicons name="checkmark-done" size={21} color="#FFF" />
									<Text style={styles.btnSignText}>CONFIRMAR OS 4 ACEITES E ENVIAR</Text>
								</>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

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
	headerBarTitle: {
		color: '#FFF',
		fontSize: 18,
		fontWeight: 'bold',
		letterSpacing: 0.5,
	},

	content: { flex: 1 },
	contentContainer: { padding: 18 },
	loadingArea: { alignItems: 'center', paddingVertical: 60 },
	loadingText: { color: '#666', marginTop: 12 },

	statusCard: {
		borderRadius: 15,
		padding: 17,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		elevation: 2,
	},
	statusTextContainer: { marginLeft: 13, flex: 1 },
	statusTitle: { fontSize: 16, fontWeight: 'bold' },
	statusSub: { fontSize: 12, marginTop: 4, lineHeight: 18 },

	voluntarioCard: {
		backgroundColor: '#FFF',
		padding: 15,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		marginBottom: 18,
		flexDirection: 'row',
		alignItems: 'center',
	},
	voluntarioIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#EEF0FA',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	voluntarioLabel: {
		fontSize: 10,
		color: '#777',
		fontWeight: 'bold',
		letterSpacing: 0.8,
	},
	voluntarioNome: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#2C3E50',
		marginTop: 2,
	},

	termHeader: { marginBottom: 12 },
	documentTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: COR_PRIMARIA,
		lineHeight: 25,
		textAlign: 'center',
	},
	documentHint: {
		textAlign: 'center',
		color: '#777',
		fontSize: 12,
		lineHeight: 17,
		marginTop: 6,
	},

	textContainer: {
		backgroundColor: '#FFF',
		borderRadius: 15,
		padding: 18,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	preambulo: {
		fontSize: 13,
		color: '#34495E',
		lineHeight: 21,
		textAlign: 'justify',
		marginBottom: 18,
	},
	clausula: {
		paddingTop: 13,
		borderTopWidth: 1,
		borderTopColor: '#ECEFF3',
	},
	clausulaTitulo: {
		fontSize: 13,
		fontWeight: 'bold',
		color: COR_PRIMARIA,
		marginBottom: 6,
	},
	legalText: {
		fontSize: 13,
		color: '#34495E',
		lineHeight: 21,
		textAlign: 'justify',
		marginBottom: 14,
	},

	acceptanceArea: {
		marginTop: 18,
		backgroundColor: '#FFF',
		borderRadius: 15,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	switchLabel: {
		marginLeft: 10,
		fontSize: 13,
		color: '#2C3E50',
		fontWeight: '500',
		flex: 1,
		lineHeight: 19,
	},
	btnSign: {
		backgroundColor: COR_PRIMARIA,
		minHeight: 55,
		borderRadius: 13,
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row',
		paddingHorizontal: 14,
		elevation: 3,
	},
	btnSignText: {
		color: '#FFF',
		fontSize: 13,
		fontWeight: 'bold',
		marginLeft: 8,
		textAlign: 'center',
		flexShrink: 1,
	},
	btnDisabled: { opacity: 0.5 },

	pendingInfo: {
		backgroundColor: '#FFF6E6',
		borderRadius: 10,
		padding: 13,
		flexDirection: 'row',
		alignItems: 'center',
	},
	pendingInfoText: {
		flex: 1,
		marginLeft: 9,
		fontSize: 12,
		color: '#6E5A35',
		lineHeight: 18,
	},
	approvedInfo: {
		backgroundColor: '#EEF8F0',
		borderRadius: 10,
		padding: 13,
		flexDirection: 'row',
		alignItems: 'center',
	},
	approvedInfoText: {
		flex: 1,
		marginLeft: 9,
		fontSize: 13,
		fontWeight: 'bold',
		color: '#2E7D32',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.55)',
		justifyContent: 'center',
		paddingHorizontal: 18,
	},
	modalAceites: {
		backgroundColor: '#FFF',
		borderRadius: 16,
		padding: 18,
		maxHeight: '88%',
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 12,
	},
	modalTitle: {
		fontSize: 19,
		fontWeight: 'bold',
		color: COR_PRIMARIA,
	},
	modalSubtitle: {
		fontSize: 12,
		color: '#666',
		lineHeight: 18,
		marginTop: 4,
	},
	aceiteFinalItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 10,
		borderTopWidth: 1,
		borderTopColor: '#ECEFF3',
	},
	aceiteFinalText: {
		flex: 1,
		marginLeft: 10,
		fontSize: 12,
		lineHeight: 18,
		color: '#2C3E50',
		paddingTop: 3,
	},
});
