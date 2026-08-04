import React, { useState, useCallback } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
	Platform, Alert, Modal, ActivityIndicator, Image, StatusBar, FlatList, KeyboardAvoidingView
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MenuLateral from '@/components/MenuLateral';

import { apiService } from '../../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';

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

const corrigeAcentos = (str: string) => {
	if (!str) return '';
	try {
		return decodeURIComponent(escape(str));
	} catch (e) {
		return str;
	}
};

export default function AdminCasasScreen() {
	const navigation = useNavigation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
	const [isAdmin, setIsAdmin] = useState(false);

	const [filtro, setFiltro] = useState({
		codigo: '', nome: '', cnpj: '', cidade: '', federativa: '', situacao: ''
	});
	const [modalSituacaoFiltro, setModalSituacaoFiltro] = useState(false);

	const [casas, setCasas] = useState<any[]>([]);
	const [isLoadingCasas, setIsLoadingCasas] = useState(false);

	const [modalVisivel, setModalVisivel] = useState(false);
	const [idEditando, setIdEditando] = useState<number | null>(null);
	const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoadingDetalhes, setIsLoadingDetalhes] = useState(false);

	const [form, setForm] = useState({
		cnpj: '', razao: '', fantasia: '', abertura: '', insc_municipal: '',
		telefone1: '', telefone2: '', email: ''
	});

	const [enderecos, setEnderecos] = useState([
		{ id: Date.now(), tipo: '', logradouro_tipo: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '' }
	]);
	const [fotos, setFotos] = useState<string[]>([]);

	const carregarCasas = async () => {
		setIsLoadingCasas(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let codigo = '';
			let nivel = '';
			let adminFlag = false;

			if (session) {
				const user = JSON.parse(session);
				setUsuarioLogado(user);
				codigo = user.codigo_casa;
				nivel = user.nivel_acesso;
				adminFlag = (nivel === 'ADMINISTRADOR');
				setIsAdmin(adminFlag);
			} else {
				router.replace('/');
				return;
			}

			const response = await apiService.api.get(`api_listar_instituicoes.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				setCasas(resData.data);
			} else {
				Alert.alert("Atenção", resData?.message || "Erro ao carregar instituições.");
			}
		} catch (error) {
			console.log("Erro na busca de casas:", error);
			Alert.alert("Erro", "Falha na comunicação com o servidor.");
		} finally {
			setIsLoadingCasas(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			navigation.setOptions({ headerShown: false });
			carregarCasas();
		}, [navigation])
	);

	const casasFiltradas = casas.filter(c => {
		if (filtro.codigo && !String(c.codigo).includes(filtro.codigo)) return false;
		if (filtro.nome && !String(c.nome).toLowerCase().includes(filtro.nome.toLowerCase())) return false;
		if (filtro.cnpj && !String(c.cnpj).includes(filtro.cnpj)) return false;
		if (filtro.cidade && !String(c.cidade).toLowerCase().includes(filtro.cidade.toLowerCase())) return false;
		if (filtro.situacao && c.situacao !== filtro.situacao) return false;
		return true;
	});

	const abrirModalInserir = () => {
		setIdEditando(null);
		setForm({ cnpj: '', razao: '', fantasia: '', abertura: '', insc_municipal: '', telefone1: '', telefone2: '', email: '' });
		setEnderecos([{ id: Date.now(), tipo: '', logradouro_tipo: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '' }]);
		setFotos([]);
		setModalVisivel(true);
	};

	const abrirModalEditar = async (id: number) => {
		setIdEditando(id);
		setIsLoadingDetalhes(true);
		setModalVisivel(true);
		try {
			const response = await apiService.api.get(`api_buscar_instituicao.php?id=${id}`);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				setForm(resData.data.form);
				setEnderecos(resData.data.enderecos);
				setFotos(resData.data.fotos || []);
			} else {
				Alert.alert("Erro", resData?.message || "Não foi possível carregar os dados.");
				setModalVisivel(false);
			}
		} catch (error) {
			Alert.alert("Erro", "Falha ao consultar instituição.");
			setModalVisivel(false);
		} finally {
			setIsLoadingDetalhes(false);
		}
	};

	const handleExcluir = (id: number, nome: string) => {
		Alert.alert(
			"Confirmar Exclusão",
			`Deseja realmente excluir a instituição "${nome}"?`,
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir",
					style: "destructive",
					onPress: async () => {
						try {
							const response = await apiService.api.get(`api_excluir_instituicao.php?id=${id}`);
							const resData = parseJSONSeguro(response.data);

							if (resData && resData.success) {
								Alert.alert("Sucesso", "Instituição excluída com sucesso!");
								carregarCasas();
							} else {
								const serverLixo = String(response.data).substring(0, 150);
								Alert.alert("Erro ao excluir", resData?.message || `Resposta crua:\n\n${serverLixo}`);
							}
						} catch (error) {
							Alert.alert("Erro", "Não foi possível comunicar com o servidor.");
						}
					}
				}
			]
		);
	};

	const buscarCNPJ = async () => {
		const cnpjLimpo = form.cnpj.replace(/[^0-9]/g, '');
		if (cnpjLimpo.length !== 14) {
			Alert.alert('Atenção', 'Digite um CNPJ válido.');
			return;
		}
		setIsLoadingCNPJ(true);
		try {
			const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
			const data = await res.json();
			if (data.cnpj) {
				setForm(prev => ({
					...prev,
					razao: data.razao_social || '',
					fantasia: data.nome_fantasia || data.razao_social || '',
					abertura: data.data_inicio_atividade ? data.data_inicio_atividade.split('-').reverse().join('/') : '',
					telefone1: data.ddd_telefone_1 || '',
					email: data.email || ''
				}));
				const novosEnderecos = [...enderecos];
				novosEnderecos[0] = { ...novosEnderecos[0], tipo: 'Principal', cep: data.cep || '', endereco: data.logradouro || '', numero: data.numero || '', complemento: data.complemento || '', bairro: data.bairro || '' };
				setEnderecos(novosEnderecos);
				Alert.alert('Sucesso', 'Dados importados da Receita Federal!');
			} else {
				Alert.alert('Erro', 'CNPJ não encontrado.');
			}
		} catch (error) {
			Alert.alert('Erro', 'Falha na busca do CNPJ.');
		} finally {
			setIsLoadingCNPJ(false);
		}
	};

	const adicionarArquivoOuFoto = () => {
		Alert.alert(
			"Adicionar Anexo",
			"Escolha o tipo de anexo que deseja enviar:",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Galeria de Fotos",
					onPress: async () => {
						let result = await ImagePicker.launchImageLibraryAsync({
							mediaTypes: ImagePicker.MediaTypeOptions.Images,
							allowsMultipleSelection: true,
							quality: 0.3,
							base64: true
						});
						if (!result.canceled) {
							const novasFotos = result.assets.filter(a => a.base64).map(a => `data:image/jpeg;base64,${a.base64}`);
							setFotos([...fotos, ...novasFotos]);
						}
					}
				},
				{
					text: "Arquivo / Documento (PDF, etc)",
					onPress: async () => {
						try {
							let result = await DocumentPicker.getDocumentAsync({
								type: '*/*',
								copyToCacheDirectory: true
							});
							if (!result.canceled && result.assets && result.assets.length > 0) {
								const asset = result.assets[0];
								const arquivoUri = asset.uri;
								setFotos([...fotos, arquivoUri]);
							}
						} catch (e) {
							Alert.alert("Erro", "Não foi possível carregar o arquivo.");
						}
					}
				}
			]
		);
	};

	const removerFoto = (indexRemover: number) => setFotos(fotos.filter((_, index) => index !== indexRemover));

	const handleGravar = async () => {
		if (!form.cnpj || !form.razao) {
			Alert.alert('Atenção', 'O CNPJ e a Razão Social são obrigatórios.');
			return;
		}

		setIsSaving(true);
		try {
			const payload = {
				id: idEditando,
				form: form,
				enderecos: enderecos,
				fotos: fotos
			};

			const response = await apiService.api.post('api_salvar_instituicao.php', payload);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				Alert.alert("Sucesso!", resData.message);
				setModalVisivel(false);
				carregarCasas();
			} else {
				const serverLixo = String(response.data).substring(0, 200);
				Alert.alert("Erro no Servidor", resData?.message || `A API devolveu isto:\n\n${serverLixo}`);
			}
		} catch (error) {
			console.log("Erro ao salvar instituição:", error);
			Alert.alert("Erro de Conexão", "Não foi possível comunicar com o servidor.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleImprimir = () => {
		Alert.alert("Imprimir", "Gerando relatório PDF...");
	};

	const opcoesSituacao = [
		{ label: 'Todas', value: '' },
		{ label: 'Ativa', value: 'Ativa' },
		{ label: 'Inativa', value: 'Inativa' }
	];

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>{isAdmin ? 'Gestão de Instituições' : 'A Minha Instituição'}</Text>
				<TouchableOpacity style={styles.menuButton} onPress={() => Alert.alert('Sair', 'Deseja sair?')}>
					<Feather name="power" size={24} color={COR_PRIMARIA} />
				</TouchableOpacity>
			</View>

			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
				<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>

					{!isAdmin && (
						<View style={styles.sectionContainer}>
							<Text style={styles.sectionTitle}>Dados Institucionais</Text>

							{isLoadingCasas ? (
								<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} />
							) : (
								casasFiltradas.map((item) => (
									<View key={item.id} style={styles.card}>
										<View style={styles.cardContent}>
											<Text style={styles.cardTitle}>{item.codigo} - {corrigeAcentos(item.nome)}</Text>
											<Text style={styles.cardSub}>CNPJ: <Text style={{ fontWeight: 'bold' }}>{item.cnpj}</Text></Text>
											<Text style={styles.cardSub}>Cidade: {corrigeAcentos(item.cidade)}</Text>
											<Text style={styles.cardSub}>Federativa: {corrigeAcentos(item.federativa)}</Text>
											<Text style={styles.cardSub}>Situação: <Text style={{ color: item.situacao === 'Ativa' ? '#28a745' : '#ED1C24', fontWeight: 'bold' }}>{item.situacao}</Text></Text>
										</View>
										<View style={styles.cardActions}>
											<TouchableOpacity style={styles.btnCardAction} onPress={() => router.push({ pathname: '/admin/diretoria', params: { casaId: String(item.id), casaNome: item.nome } })}>
												<Feather name="users" size={18} color={COR_PRIMARIA} />
												<Text style={[styles.btnCardActionText, { color: COR_PRIMARIA }]}>Diretoria</Text>
											</TouchableOpacity>

											<View style={styles.divisorVertical} />

											<TouchableOpacity style={styles.btnCardAction} onPress={() => abrirModalEditar(item.id)}>
												<Feather name="edit" size={18} color="#007bff" />
												<Text style={[styles.btnCardActionText, { color: '#007bff' }]}>Editar</Text>
											</TouchableOpacity>
										</View>
									</View>
								))
							)}
						</View>
					)}

					{isAdmin && (
						<>
							<View style={styles.sectionContainer}>
								<Text style={styles.sectionTitle}>Filtros de Busca</Text>

								<View style={styles.row}>
									<View style={{ flex: 1, marginRight: 5 }}>
										<Text style={styles.label}>Código</Text>
										<TextInput style={styles.input} value={filtro.codigo} onChangeText={t => setFiltro({ ...filtro, codigo: t })} keyboardType="numeric" />
									</View>
									<View style={{ flex: 3, marginLeft: 5 }}>
										<Text style={styles.label}>Nome</Text>
										<TextInput style={styles.input} value={filtro.nome} onChangeText={t => setFiltro({ ...filtro, nome: t })} />
									</View>
								</View>

								<View style={styles.row}>
									<View style={{ flex: 2, marginRight: 5 }}>
										<Text style={styles.label}>CNPJ</Text>
										<MaskedTextInput mask="99.999.999/9999-99" style={styles.input} value={filtro.cnpj} onChangeText={(_, raw) => setFiltro({ ...filtro, cnpj: raw })} keyboardType="numeric" />
									</View>
									<View style={{ flex: 2, marginLeft: 5 }}>
										<Text style={styles.label}>Cidade</Text>
										<TextInput style={styles.input} value={filtro.cidade} onChangeText={t => setFiltro({ ...filtro, cidade: t })} />
									</View>
								</View>

								<View style={styles.row}>
									<View style={{ flex: 2, marginRight: 5 }}>
										<Text style={styles.label}>Federativa</Text>
										<TextInput style={styles.input} value={filtro.federativa} onChangeText={t => setFiltro({ ...filtro, federativa: t })} />
									</View>
									<View style={{ flex: 2, marginLeft: 5 }}>
										<Text style={styles.label}>Situação</Text>
										<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalSituacaoFiltro(true)} activeOpacity={0.7}>
											<Text style={{ fontSize: 14, color: filtro.situacao ? '#000' : '#888', flex: 1 }}>
												{opcoesSituacao.find(o => o.value === filtro.situacao)?.label || 'Todas'}
											</Text>
											<Feather name="chevron-down" size={20} color="#000" />
										</TouchableOpacity>
									</View>
								</View>

								<View style={[styles.row, { marginTop: 10, gap: 10 }]}>
									<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#28a745' }]} onPress={abrirModalInserir}>
										<Feather name="plus" size={18} color="#fff" />
										<Text style={styles.btnActionText}>Inserir</Text>
									</TouchableOpacity>

									<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#007bff' }]} onPress={carregarCasas}>
										<Feather name="search" size={18} color="#fff" />
										<Text style={styles.btnActionText}>Buscar</Text>
									</TouchableOpacity>
									<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#fd7e14' }]} onPress={handleImprimir}>
										<Feather name="printer" size={18} color="#fff" />
										<Text style={styles.btnActionText}>Imprimir</Text>
									</TouchableOpacity>
								</View>
							</View>

							{isLoadingCasas ? (
								<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} />
							) : (
								casasFiltradas.length === 0 ? (
									<Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>Nenhuma instituição encontrada.</Text>
								) : (
									casasFiltradas.map((item) => (
										<View key={item.id} style={styles.card}>
											<View style={styles.cardContent}>
												<Text style={styles.cardTitle}>{item.codigo} - {corrigeAcentos(item.nome)}</Text>
												<Text style={styles.cardSub}>CNPJ: <Text style={{ fontWeight: 'bold' }}>{item.cnpj}</Text></Text>
												<Text style={styles.cardSub}>Cidade: {corrigeAcentos(item.cidade)}</Text>
												<Text style={styles.cardSub}>Federativa: {corrigeAcentos(item.federativa)}</Text>
												<Text style={styles.cardSub}>Situação: <Text style={{ color: item.situacao === 'Ativa' ? '#28a745' : '#ED1C24', fontWeight: 'bold' }}>{item.situacao}</Text></Text>
											</View>
											<View style={styles.cardActions}>
												<TouchableOpacity style={styles.btnCardAction} onPress={() => router.push({ pathname: '/admin/diretoria', params: { casaId: String(item.id), casaNome: item.nome } })}>
													<Feather name="users" size={18} color={COR_PRIMARIA} />
													<Text style={[styles.btnCardActionText, { color: COR_PRIMARIA }]}>Diretoria</Text>
												</TouchableOpacity>

												<View style={styles.divisorVertical} />

												<TouchableOpacity style={styles.btnCardAction} onPress={() => abrirModalEditar(item.id)}>
													<Feather name="edit" size={18} color="#007bff" />
													<Text style={[styles.btnCardActionText, { color: '#007bff' }]}>Editar</Text>
												</TouchableOpacity>

												<View style={styles.divisorVertical} />
												<TouchableOpacity style={styles.btnCardAction} onPress={() => handleExcluir(item.id, item.nome)}>
													<Feather name="trash-2" size={18} color="#ED1C24" />
													<Text style={[styles.btnCardActionText, { color: '#ED1C24' }]}>Excluir</Text>
												</TouchableOpacity>
											</View>
										</View>
									))
								)
							)}
						</>
					)}
				</ScrollView>
			</KeyboardAvoidingView>

			<Modal visible={modalSituacaoFiltro} transparent animationType="fade">
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalSituacaoFiltro(false)}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Selecione a Situação</Text>
							<TouchableOpacity onPress={() => setModalSituacaoFiltro(false)} style={{ padding: 5 }}>
								<Feather name="x" size={24} color="#555" />
							</TouchableOpacity>
						</View>
						<FlatList
							data={opcoesSituacao}
							keyExtractor={(item, index) => index.toString()}
							renderItem={({ item }) => {
								const isSelected = filtro.situacao === item.value;
								return (
									<TouchableOpacity
										style={styles.modalItem}
										onPress={() => {
											setFiltro({ ...filtro, situacao: item.value });
											setModalSituacaoFiltro(false);
										}}
									>
										<Text style={[styles.modalItemText, isSelected && { color: COR_PRIMARIA, fontWeight: 'bold' }]}>
											{item.label}
										</Text>
										{isSelected && <Feather name="check" size={18} color={COR_PRIMARIA} />}
									</TouchableOpacity>
								)
							}}
						/>
					</View>
				</TouchableOpacity>
			</Modal>

			<Modal visible={modalVisivel} transparent animationType="slide">
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
					<View style={styles.modalOverlayBottom}>
						<View style={styles.modalContentBottom}>
							<View style={styles.modalHeaderBottom}>
								<Text style={[styles.headerTitleModal, { color: COR_PRIMARIA }]}>
									{idEditando ? 'Editar Instituição' : 'Cadastrar Instituição'}
								</Text>
								<TouchableOpacity onPress={() => setModalVisivel(false)} style={{ padding: 5 }}>
									<Feather name="x" size={26} color="#555" />
								</TouchableOpacity>
							</View>

							{isLoadingDetalhes ? (
								<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
									<ActivityIndicator size="large" color={COR_PRIMARIA} />
									<Text style={{ marginTop: 10, color: '#666' }}>Carregando dados da instituição...</Text>
								</View>
							) : (
								<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
									<View style={styles.sectionContainer}>
										<Text style={styles.sectionTitle}>Dados Principais (PJ)</Text>

										<Text style={styles.label}>CNPJ</Text>
										<View style={styles.row}>
											<MaskedTextInput mask="99.999.999/9999-99" style={[styles.input, { flex: 4, marginRight: 10 }]} keyboardType="numeric" value={form.cnpj} onChangeText={(_, raw) => setForm({ ...form, cnpj: raw })} />
											<TouchableOpacity style={styles.btnBuscaForm} onPress={buscarCNPJ} disabled={isLoadingCNPJ}>
												{isLoadingCNPJ ? <ActivityIndicator color="#fff" /> : <Feather name="search" size={20} color="#fff" />}
											</TouchableOpacity>
										</View>

										<Text style={styles.label}>Razão Social</Text>
										<TextInput style={styles.input} value={form.razao} onChangeText={t => setForm({ ...form, razao: t })} />

										<Text style={styles.label}>Nome Fantasia</Text>
										<TextInput style={styles.input} value={form.fantasia} onChangeText={t => setForm({ ...form, fantasia: t })} />

										<View style={styles.row}>
											<View style={{ flex: 2, marginRight: 5 }}>
												<Text style={styles.label}>Abertura</Text>
												<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.abertura} onChangeText={t => setForm({ ...form, abertura: t })} />
											</View>
											<View style={{ flex: 2, marginLeft: 5 }}>
												<Text style={styles.label}>Inscrição Municipal</Text>
												<TextInput style={styles.input} keyboardType="numeric" value={form.insc_municipal} onChangeText={t => setForm({ ...form, insc_municipal: t })} />
											</View>
										</View>

										<View style={styles.row}>
											<View style={{ flex: 2, marginRight: 5 }}>
												<Text style={styles.label}>Telefone 1</Text>
												<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="numeric" value={form.telefone1} onChangeText={(_, raw) => setForm({ ...form, telefone1: raw })} />
											</View>
											<View style={{ flex: 2, marginLeft: 5 }}>
												<Text style={styles.label}>Telefone 2</Text>
												<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="numeric" value={form.telefone2} onChangeText={(_, raw) => setForm({ ...form, telefone2: raw })} />
											</View>
										</View>

										<Text style={styles.label}>E-mail</Text>
										<TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={t => setForm({ ...form, email: t })} />
									</View>

									<View style={styles.sectionContainer}>
										<Text style={styles.sectionTitle}>Endereços</Text>
										{enderecos.map((item, index) => (
											<View key={item.id} style={styles.blocoDinamico}>
												<View style={styles.row}>
													<Text style={styles.label}>Endereço {index + 1}</Text>
													{index > 0 && <TouchableOpacity onPress={() => setEnderecos(enderecos.filter(e => e.id !== item.id))}><Feather name="trash-2" size={18} color="#ED1C24" /></TouchableOpacity>}
												</View>

												<View style={styles.row}>
													<View style={{ flex: 2, marginRight: 5 }}>
														<Text style={styles.label}>Tipo do Endereço</Text>
														<TextInput style={styles.input} placeholder="Ex: Principal" value={item.tipo} onChangeText={t => { const n = [...enderecos]; n[index].tipo = t; setEnderecos(n); }} />
													</View>
													<View style={{ flex: 2, marginLeft: 5 }}>
														<Text style={styles.label}>Logradouro</Text>
														<TextInput style={styles.input} placeholder="Ex: Rua, Av" value={item.logradouro_tipo} onChangeText={t => { const n = [...enderecos]; n[index].logradouro_tipo = t; setEnderecos(n); }} />
													</View>
												</View>

												<Text style={styles.label}>CEP</Text>
												<MaskedTextInput mask="99999-999" style={styles.input} keyboardType="numeric" value={item.cep} onChangeText={t => { const n = [...enderecos]; n[index].cep = t; setEnderecos(n); }} />

												<Text style={styles.label}>Endereço</Text>
												<TextInput style={styles.input} value={item.endereco} onChangeText={t => { const n = [...enderecos]; n[index].endereco = t; setEnderecos(n); }} />

												<View style={styles.row}>
													<View style={{ flex: 1, marginRight: 5 }}>
														<Text style={styles.label}>Nº</Text>
														<TextInput style={styles.input} value={item.numero} onChangeText={t => { const n = [...enderecos]; n[index].numero = t; setEnderecos(n); }} />
													</View>
													<View style={{ flex: 3, marginLeft: 5 }}>
														<Text style={styles.label}>Complemento</Text>
														<TextInput style={styles.input} value={item.complemento} onChangeText={t => { const n = [...enderecos]; n[index].complemento = t; setEnderecos(n); }} />
													</View>
												</View>

												<View style={styles.row}>
													<View style={{ flex: 2, marginRight: 5 }}>
														<Text style={styles.label}>Bairro</Text>
														<TextInput style={styles.input} value={item.bairro} onChangeText={t => { const n = [...enderecos]; n[index].bairro = t; setEnderecos(n); }} />
													</View>
													<View style={{ flex: 2, marginLeft: 5 }}>
														<Text style={styles.label}>Cidade</Text>
														<TextInput style={styles.input} value={item.cidade} onChangeText={t => { const n = [...enderecos]; n[index].cidade = t; setEnderecos(n); }} />
													</View>
												</View>
											</View>
										))}

										<TouchableOpacity style={styles.btnAddItem} onPress={() => setEnderecos([...enderecos, { id: Date.now(), tipo: '', logradouro_tipo: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '' }])}>
											<Feather name="plus" size={18} color="#28a745" />
											<Text style={styles.btnAddItemText}>Adicionar Endereço</Text>
										</TouchableOpacity>
									</View>

									<View style={styles.sectionContainer}>
										<Text style={styles.sectionTitle}>Fotos e Anexos (Arquivos)</Text>
										{fotos.length > 0 && (
											<View style={styles.fotosGrid}>
												{fotos.map((uri, index) => {
													const isPdfOrDoc = uri.includes('.pdf') || uri.startsWith('file:') || !uri.startsWith('data:image');
													return (
														<View key={index} style={styles.fotoThumbContainer}>
															{isPdfOrDoc ? (
																<View style={styles.docThumb}>
																	<Feather name="file-text" size={32} color={COR_PRIMARIA} />
																	<Text style={styles.docThumbText} numberOfLines={1}>Anexo {index + 1}</Text>
																</View>
															) : (
																<Image source={{ uri }} style={styles.fotoThumb} />
															)}
															<TouchableOpacity style={styles.btnRemoverFoto} onPress={() => removerFoto(index)}>
																<Feather name="x" size={14} color="#fff" />
															</TouchableOpacity>
														</View>
													);
												})}
											</View>
										)}
										<TouchableOpacity style={styles.btnFotoAction} onPress={adicionarArquivoOuFoto}>
											<Feather name="paperclip" size={24} color="#555" />
											<Text style={styles.btnFotoActionText}>Adicionar Foto ou Anexo (Arquivo)</Text>
										</TouchableOpacity>
									</View>

									<TouchableOpacity style={styles.btnSalvarFull} onPress={handleGravar} disabled={isSaving}>
										{isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSalvarFullText}>Gravar</Text>}
									</TouchableOpacity>
									<View style={{ height: 40 }} />
								</ScrollView>
							)}
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>

			<MenuLateral
				isOpen={isMenuOpen}
				onClose={() => setIsMenuOpen(false)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f4f6f8' },
	scrollContent: { flex: 1, backgroundColor: '#f4f6f8' },

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

	sectionContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 20 },
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
	input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#000', marginBottom: 15 },
	row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

	pickerWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#f9f9f9', marginBottom: 15, paddingHorizontal: 15, minHeight: 48 },

	btnAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 45, borderRadius: 8 },
	btnActionText: { color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
	btnBuscaForm: { backgroundColor: '#28a745', height: 45, width: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },

	card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
	cardContent: { marginBottom: 10 },
	cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 5 },
	cardSub: { fontSize: 13, color: '#666', marginBottom: 2 },

	cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', marginTop: 10 },
	btnCardAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
	btnCardActionText: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
	divisorVertical: { width: 1, backgroundColor: '#eee', height: '60%' },

	blocoDinamico: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', marginBottom: 15 },
	btnAddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#28a745', borderStyle: 'dashed' },
	btnAddItemText: { color: '#28a745', fontWeight: 'bold', marginLeft: 8 },

	fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
	fotoThumbContainer: { position: 'relative', marginRight: 10, marginBottom: 10 },
	fotoThumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
	docThumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#eef2f7', justifyContent: 'center', alignItems: 'center', padding: 5 },
	docThumbText: { fontSize: 10, color: '#333', marginTop: 4, textAlign: 'center' },
	btnRemoverFoto: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ED1C24', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
	btnFotoAction: { backgroundColor: '#f0f0f0', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
	btnFotoActionText: { marginTop: 8, fontSize: 14, color: '#555', fontWeight: 'bold' },

	btnSalvarFull: { backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10 },
	btnSalvarFullText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
	modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 },
	modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
	modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
	modalItemText: { fontSize: 15, color: '#333' },

	modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContentBottom: { backgroundColor: '#f4f6f8', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
	modalHeaderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' },
	headerTitleModal: { fontSize: 18, fontWeight: 'bold' }
});