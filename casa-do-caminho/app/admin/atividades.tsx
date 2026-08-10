import React, { useState, useCallback } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
	Platform, Alert, Modal, ActivityIndicator, StatusBar, FlatList, KeyboardAvoidingView, Image
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MenuLateral from '@/components/MenuLateral';

import { apiService } from '../../src/services/apiService';

const COR_PRIMARIA = '#1B2669';

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

export default function AtividadesScreen() {
	const navigation = useNavigation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
	const [isAdmin, setIsAdmin] = useState(false);

	const [filtro, setFiltro] = useState({
		codigo: '', nome: '', instituicao: '', situacao: ''
	});
	const [modalFiltroAtivo, setModalFiltroAtivo] = useState<'situacao' | 'instituicao' | null>(null);

	const [atividades, setAtividades] = useState<any[]>([]);
	const [instituicoesDb, setInstituicoesDb] = useState<{ label: string, value: string }[]>([]);

	const [frequentadoresDb, setFrequentadoresDb] = useState<{ label: string, value: string }[]>([]);

	const [isLoadingList, setIsLoadingList] = useState(false);

	const [modalVisivel, setModalVisivel] = useState(false);
	const [idEditando, setIdEditando] = useState<number | null>(null);
	const [isLoadingDetalhes, setIsLoadingDetalhes] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [modalFormAtivo, setModalFormAtivo] = useState<{ campo: string, index?: number } | null>(null);

	const [form, setForm] = useState({
		instituicao: '', nome: '', diaSemana: '', horaInicial: '', horaFinal: ''
	});

	const [coordenadores, setCoordenadores] = useState([
		{ id: Date.now(), nome: '' }
	]);
	const [fotos, setFotos] = useState<string[]>([]);

	const carregarDados = async () => {
		setIsLoadingList(true);
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

			const resAtiv = await apiService.api.get(`api_listar_atividades.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resDataAtiv = parseJSONSeguro(resAtiv.data);
			if (resDataAtiv && resDataAtiv.success) {
				setAtividades(resDataAtiv.data);
			}

			const resInst = await apiService.api.get(`api_listar_instituicoes.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resDataInst = parseJSONSeguro(resInst.data);
			if (resDataInst && resDataInst.success) {
				let lista = resDataInst.data;

				if (!adminFlag && codigo !== '') {
					lista = lista.filter((i: any) => String(i.codigo) === String(codigo));
					if (lista.length > 0) {
						setFiltro(prev => ({ ...prev, instituicao: lista[0].nome }));
					}
				}

				const mapped = lista.map((i: any) => ({
					label: i.nome,
					value: i.nome
				}));
				setInstituicoesDb(mapped);
			}

			const resFreq = await apiService.api.get(`api_listar_frequentadores.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resDataFreq = parseJSONSeguro(resFreq.data);
			if (resDataFreq && resDataFreq.success) {
				const mappedFreq = resDataFreq.data.map((f: any) => ({
					label: f.nome,
					value: f.nome
				}));
				setFrequentadoresDb(mappedFreq);
			}

		} catch (error) {
			Alert.alert("Erro", "Falha na comunicação com o servidor.");
		} finally {
			setIsLoadingList(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			navigation.setOptions({ headerShown: false });
			carregarDados();
		}, [navigation])
	);

	const atividadesFiltradas = atividades.filter(a => {
		if (filtro.codigo && !String(a.codigo).includes(filtro.codigo)) return false;
		if (filtro.nome && !String(a.nome).toLowerCase().includes(filtro.nome.toLowerCase())) return false;
		if (filtro.instituicao && a.instituicao !== filtro.instituicao) return false;
		if (filtro.situacao && a.situacao !== filtro.situacao) return false;
		return true;
	});

	const abrirModalInserir = () => {
		setIdEditando(null);

		let instituicaoInicial = '';
		if (!isAdmin && instituicoesDb.length > 0) {
			instituicaoInicial = instituicoesDb[0].value;
		}

		setForm({ instituicao: instituicaoInicial, nome: '', diaSemana: '', horaInicial: '', horaFinal: '' });
		setCoordenadores([{ id: Date.now(), nome: '' }]);
		setFotos([]);
		setModalVisivel(true);
	};

	const abrirModalEditar = async (id: number) => {
		setIdEditando(id);
		setIsLoadingDetalhes(true);
		setModalVisivel(true);
		try {
			const response = await apiService.api.get(`api_buscar_atividade.php?id=${id}`);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				setForm(resData.data.form);
				setCoordenadores(resData.data.coordenadores);
				setFotos(resData.data.fotos || []);
			} else {
				Alert.alert("Erro", resData?.message || "Não foi possível carregar os dados.");
				setModalVisivel(false);
			}
		} catch (error) {
			Alert.alert("Erro", "Falha ao consultar atividade.");
			setModalVisivel(false);
		} finally {
			setIsLoadingDetalhes(false);
		}
	};

	const handleExcluir = (id: number, nome: string) => {
		Alert.alert(
			"Confirmar Exclusão",
			`Deseja realmente excluir a atividade "${nome}"?`,
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir",
					style: "destructive",
					onPress: async () => {
						try {
							const response = await apiService.api.get(`api_excluir_atividade.php?id=${id}`);
							const resData = parseJSONSeguro(response.data);

							if (resData && resData.success) {
								Alert.alert("Sucesso", "Atividade excluída com sucesso!");
								carregarDados();
							} else {
								Alert.alert("Erro ao excluir", resData?.message || "Erro.");
							}
						} catch (error) {
							Alert.alert("Erro", "Não foi possível comunicar com o servidor.");
						}
					}
				}
			]
		);
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
							allowsMultipleSelection: true, quality: 0.3, base64: true
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
								setFotos([...fotos, asset.uri]);
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
		if (!form.nome || !form.instituicao) {
			Alert.alert('Atenção', 'A Instituição e o Nome da Atividade são obrigatórios.');
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				id: idEditando,
				form: form,
				coordenadores: coordenadores,
				fotos: fotos
			};
			const response = await apiService.api.post('api_salvar_atividade.php', payload);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				Alert.alert("Sucesso!", resData.message);
				setModalVisivel(false);
				carregarDados();
			} else {
				Alert.alert("Erro no Servidor", resData?.message || "Erro.");
			}
		} catch (error) {
			Alert.alert("Erro de Conexão", "Não foi possível comunicar com o servidor.");
		} finally {
			setIsSaving(false);
		}
	};

	const opcoesSituacao = [{ label: 'Todas', value: '' }, { label: 'Ativa', value: 'Ativa' }, { label: 'Inativa', value: 'Inativa' }];
	const opcoesDiaSemana = [{ label: 'Domingo', value: 'Domingo' }, { label: 'Segunda-feira', value: 'Segunda-feira' }, { label: 'Terça-feira', value: 'Terça-feira' }, { label: 'Quarta-feira', value: 'Quarta-feira' }, { label: 'Quinta-feira', value: 'Quinta-feira' }, { label: 'Sexta-feira', value: 'Sexta-feira' }, { label: 'Sábado', value: 'Sábado' }];

	const getDadosModalForm = () => {
		if (!modalFormAtivo) return [];
		switch (modalFormAtivo.campo) {
			case 'instituicao': return instituicoesDb;
			case 'diaSemana': return opcoesDiaSemana;
			case 'coordenador':
				return [{ label: 'Selecione...', value: '' }, ...frequentadoresDb];
			default: return [];
		}
	};

	const handleSelecionarOpcaoForm = (valor: string) => {
		if (!modalFormAtivo) return;
		const { campo, index } = modalFormAtivo;
		if (campo === 'instituicao') setForm({ ...form, instituicao: valor });
		else if (campo === 'diaSemana') setForm({ ...form, diaSemana: valor });
		else if (campo === 'coordenador' && index !== undefined) {
			const n = [...coordenadores];
			n[index].nome = valor;
			setCoordenadores(n);
		}
		setModalFormAtivo(null);
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Gestão de Atividades</Text>
				<TouchableOpacity style={styles.menuButton} onPress={() => { }}>
					<Feather name="power" size={24} color={COR_PRIMARIA} />
				</TouchableOpacity>
			</View>

			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
				<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>

					<View style={styles.sectionContainer}>
						<Text style={styles.sectionTitle}>Filtros de Busca</Text>

						<View style={styles.row}>
							<View style={{ flex: 1, marginRight: 5 }}>
								<Text style={styles.label}>Código</Text>
								<TextInput style={styles.input} value={filtro.codigo} onChangeText={t => setFiltro({ ...filtro, codigo: t })} keyboardType="numeric" />
							</View>
							<View style={{ flex: 3, marginLeft: 5 }}>
								<Text style={styles.label}>Nome da Atividade</Text>
								<TextInput style={styles.input} value={filtro.nome} onChangeText={t => setFiltro({ ...filtro, nome: t })} />
							</View>
						</View>

						<View style={styles.row}>
							<View style={{ flex: 2, marginRight: 5 }}>
								<Text style={styles.label}>Instituição</Text>
								<TouchableOpacity
									style={[styles.pickerWrapper, !isAdmin && { backgroundColor: '#f0f0f0' }]}
									onPress={() => { if (isAdmin) setModalFiltroAtivo('instituicao'); }}
									activeOpacity={0.7}
								>
									<Text style={{ fontSize: 14, color: filtro.instituicao ? '#000' : '#888', flex: 1 }}>{filtro.instituicao || (isAdmin ? 'Selecione...' : 'Carregando...')}</Text>
									{isAdmin && <Feather name="chevron-down" size={20} color="#000" />}
								</TouchableOpacity>
							</View>
							<View style={{ flex: 2, marginLeft: 5 }}>
								<Text style={styles.label}>Situação</Text>
								<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFiltroAtivo('situacao')} activeOpacity={0.7}>
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
							<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#007bff' }]} onPress={carregarDados}>
								<Feather name="search" size={18} color="#fff" />
								<Text style={styles.btnActionText}>Buscar</Text>
							</TouchableOpacity>
						</View>
					</View>

					{isLoadingList ? (
						<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} />
					) : (
						atividadesFiltradas.length === 0 ? (
							<Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>Nenhuma atividade cadastrada.</Text>
						) : (
							atividadesFiltradas.map((item) => (
								<View key={item.id} style={styles.card}>
									<View style={styles.cardContent}>
										<Text style={styles.cardTitle}>{item.codigo} - {corrigeAcentos(item.nome)}</Text>
										<Text style={styles.cardSub}>Instituição: <Text style={{ fontWeight: 'bold' }}>{corrigeAcentos(item.instituicao)}</Text></Text>
										<Text style={styles.cardSub}>Dia da Semana: {corrigeAcentos(item.dia_semana)}</Text>
										<Text style={styles.cardSub}>Horário: {item.hora_inicial} às {item.hora_final}</Text>
										<Text style={styles.cardSub}>Coordenador(es): {corrigeAcentos(item.coordenadores)}</Text>
										<Text style={styles.cardSub}>Situação: <Text style={{ color: item.situacao === 'Ativa' ? '#28a745' : '#ED1C24', fontWeight: 'bold' }}>{corrigeAcentos(item.situacao)}</Text></Text>
									</View>
									<View style={styles.cardActions}>
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
				</ScrollView>
			</KeyboardAvoidingView>

			<Modal visible={!!modalFiltroAtivo} transparent animationType="fade">
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalFiltroAtivo(null)}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Selecione uma opção</Text>
							<TouchableOpacity onPress={() => setModalFiltroAtivo(null)} style={{ padding: 5 }}>
								<Feather name="x" size={24} color="#555" />
							</TouchableOpacity>
						</View>
						<FlatList
							data={modalFiltroAtivo === 'situacao' ? opcoesSituacao : [{ label: 'Todas as Instituições', value: '' }, ...instituicoesDb]}
							keyExtractor={(item, index) => index.toString()}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={styles.modalItem}
									onPress={() => {
										if (modalFiltroAtivo === 'situacao') setFiltro({ ...filtro, situacao: item.value });
										if (modalFiltroAtivo === 'instituicao') setFiltro({ ...filtro, instituicao: item.value });
										setModalFiltroAtivo(null);
									}}
								>
									<Text style={styles.modalItemText}>{item.label}</Text>
								</TouchableOpacity>
							)}
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
									{idEditando ? 'Editar Atividade' : 'Cadastrar Atividade'}
								</Text>
								<TouchableOpacity onPress={() => setModalVisivel(false)} style={{ padding: 5 }}>
									<Feather name="x" size={26} color="#555" />
								</TouchableOpacity>
							</View>

							{isLoadingDetalhes ? (
								<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
									<ActivityIndicator size="large" color={COR_PRIMARIA} />
								</View>
							) : (
								<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
									<View style={styles.sectionContainer}>
										<Text style={styles.sectionTitle}>Dados da Atividade</Text>

										<Text style={styles.label}>Instituição</Text>
										<TouchableOpacity
											style={[styles.pickerWrapper, !isAdmin && { backgroundColor: '#f0f0f0' }]}
											onPress={() => { if (isAdmin) setModalFormAtivo({ campo: 'instituicao' }); }}
											activeOpacity={0.7}
										>
											<Text style={{ fontSize: 14, color: form.instituicao ? '#000' : '#888', flex: 1 }}>{form.instituicao || 'Selecione...'}</Text>
											{isAdmin && <Feather name="chevron-down" size={20} color="#000" />}
										</TouchableOpacity>

										<Text style={styles.label}>Nome da Atividade</Text>
										<TextInput style={styles.input} value={form.nome} onChangeText={t => setForm({ ...form, nome: t })} />

										<Text style={styles.label}>Dia da Semana</Text>
										<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFormAtivo({ campo: 'diaSemana' })} activeOpacity={0.7}>
											<Text style={{ fontSize: 14, color: form.diaSemana ? '#000' : '#888', flex: 1 }}>{form.diaSemana || 'Selecione...'}</Text>
											<Feather name="chevron-down" size={20} color="#000" />
										</TouchableOpacity>

										<View style={styles.row}>
											<View style={{ flex: 1, marginRight: 5 }}>
												<Text style={styles.label}>Hora Inicial</Text>
												<MaskedTextInput mask="99:99" style={styles.input} keyboardType="numeric" placeholder="00:00" value={form.horaInicial} onChangeText={t => setForm({ ...form, horaInicial: t })} />
											</View>
											<View style={{ flex: 1, marginLeft: 5 }}>
												<Text style={styles.label}>Hora Final</Text>
												<MaskedTextInput mask="99:99" style={styles.input} keyboardType="numeric" placeholder="00:00" value={form.horaFinal} onChangeText={t => setForm({ ...form, horaFinal: t })} />
											</View>
										</View>
									</View>

									<View style={styles.sectionContainer}>
										<Text style={styles.sectionTitle}>Coordenadores</Text>
										{coordenadores.map((item, index) => (
											<View key={item.id} style={styles.blocoDinamico}>
												<View style={styles.row}>
													<Text style={styles.label}>Coordenador {index + 1}</Text>
													{index > 0 && <TouchableOpacity onPress={() => setCoordenadores(coordenadores.filter(c => c.id !== item.id))}><Feather name="trash-2" size={18} color="#ED1C24" /></TouchableOpacity>}
												</View>

												<TouchableOpacity
													style={[styles.pickerWrapper, { marginBottom: 0 }]}
													onPress={() => setModalFormAtivo({ campo: 'coordenador', index })}
													activeOpacity={0.7}
												>
													<Text style={{ fontSize: 14, color: item.nome ? '#000' : '#888', flex: 1 }}>
														{item.nome || 'Selecione um coordenador...'}
													</Text>
													<Feather name="chevron-down" size={20} color="#000" />
												</TouchableOpacity>
											</View>
										))}
										<TouchableOpacity style={styles.btnAddItem} onPress={() => setCoordenadores([...coordenadores, { id: Date.now(), nome: '' }])}>
											<Feather name="plus" size={18} color="#28a745" />
											<Text style={styles.btnAddItemText}>Adicionar Coordenador</Text>
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

					{!!modalFormAtivo && (
						<TouchableOpacity style={styles.pseudoModalOverlay} activeOpacity={1} onPress={() => setModalFormAtivo(null)}>
							<View style={styles.modalContent}>
								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>Selecione uma opção</Text>
									<TouchableOpacity onPress={() => setModalFormAtivo(null)} style={{ padding: 5 }}>
										<Feather name="x" size={24} color="#555" />
									</TouchableOpacity>
								</View>
								<FlatList
									data={getDadosModalForm()}
									keyExtractor={(item, index) => index.toString()}
									renderItem={({ item }) => (
										<TouchableOpacity style={styles.modalItem} onPress={() => handleSelecionarOpcaoForm(item.value)}>
											<Text style={styles.modalItemText}>{item.label}</Text>
										</TouchableOpacity>
									)}
								/>
							</View>
						</TouchableOpacity>
					)}

				</KeyboardAvoidingView>
			</Modal>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f4f6f8' },
	scrollContent: { flex: 1, backgroundColor: '#f4f6f8' },
	headerBar: {
		height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20),
		paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
		backgroundColor: COR_PRIMARIA, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, elevation: 5, zIndex: 10,
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
	headerTitleModal: { fontSize: 18, fontWeight: 'bold' },
	pseudoModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20, zIndex: 9999 }
});