import React, { useState, useCallback, useEffect } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
	Platform, Alert, Modal, StatusBar, ActivityIndicator, KeyboardAvoidingView, FlatList
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import { router, useLocalSearchParams } from 'expo-router';
import { apiService } from '../../src/services/apiService';
import { useFocusEffect } from '@react-navigation/native';

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

const validarCPF = (cpfCru: string) => {
	let cpf = cpfCru.replace(/[^\d]+/g, '');
	if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
	let soma = 0, resto;
	for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
	resto = (soma * 10) % 11;
	if (resto === 10 || resto === 11) resto = 0;
	if (resto !== parseInt(cpf.substring(9, 10))) return false;
	soma = 0;
	for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
	resto = (soma * 10) % 11;
	if (resto === 10 || resto === 11) resto = 0;
	if (resto !== parseInt(cpf.substring(10, 11))) return false;
	return true;
};

export default function DiretoriaScreen() {
	const params = useLocalSearchParams();
	const casaId = params.casaId || '';
	const casaNome = params.casaNome || 'Instituição';

	const [filtro, setFiltro] = useState({ dataInicial: '', dataFinal: '' });

	const [modalVisivel, setModalVisivel] = useState(false);
	const [idEditando, setIdEditando] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoadingDetalhes, setIsLoadingDetalhes] = useState(false);
	const [diretorias, setDiretorias] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const [cidadesDb, setCidadesDb] = useState<{ label: string, value: string }[]>([]);
	const [modalFormAtivo, setModalFormAtivo] = useState<{ campo: string, index?: number } | null>(null);
	const [buscaCombo, setBuscaCombo] = useState('');

	useEffect(() => {
		if (!modalFormAtivo) setBuscaCombo('');
	}, [modalFormAtivo]);

	const carregarDiretorias = async () => {
		setIsLoading(true);
		try {
			const response = await apiService.api.get(`api_listar_diretorias.php?casaId=${casaId}`);
			const resData = parseJSONSeguro(response.data);
			if (resData && resData.success) {
				setDiretorias(resData.data);
			}

			const resCidades = await apiService.api.get(`api_listar_cidades.php`);
			const resDataCidades = parseJSONSeguro(resCidades.data);
			if (resDataCidades && resDataCidades.success) {
				setCidadesDb(resDataCidades.data.map((c: any) => ({ label: c.nome, value: c.nome })));
			}
		} catch (error) {
			Alert.alert("Erro", "Falha na comunicação com o servidor.");
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => { carregarDiretorias(); }, [casaId])
	);

	const [form, setForm] = useState({ eleicao: '', inicio: '', fim: '' });

	const templateMembro = {
		id: Date.now(), cargo: '', cpf: '', nome: '', nascimento: '',
		nacionalidade: '', profissao: '', estadoCivil: '', naturalidade: '',
		rg: '', expedicao: '', orgao: '', telefone1: '', telefone2: '', email: ''
	};

	const [membros, setMembros] = useState([templateMembro]);

	const abrirModalInserir = () => {
		setIdEditando(null);
		setForm({ eleicao: '', inicio: '', fim: '' });
		setMembros([{ ...templateMembro, id: Date.now() }]);
		setModalVisivel(true);
	};

	const abrirModalEditar = async (id: number) => {
		setIdEditando(id);
		setIsLoadingDetalhes(true);
		setModalVisivel(true);
		try {
			const response = await apiService.api.get(`api_buscar_diretoria.php?id=${id}`);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				setForm(resData.data.form);
				setMembros(resData.data.membros);
			} else {
				Alert.alert("Erro", resData?.message || "Não foi possível carregar os dados.");
				setModalVisivel(false);
			}
		} catch (error) {
			Alert.alert("Erro", "Falha ao consultar diretoria.");
			setModalVisivel(false);
		} finally {
			setIsLoadingDetalhes(false);
		}
	};

	const buscarMembroPorCPF = async (cpfCru: string, index: number) => {
		const cpfNum = cpfCru.replace(/\D/g, '');
		if (cpfNum.length !== 11) return;

		if (!validarCPF(cpfCru)) {
			Alert.alert("CPF Inválido", "O CPF digitado não é válido.");
			return;
		}

		try {
			const res = await apiService.api.get(`api_buscar_frequentador_cpf.php?cpf=${cpfNum}`);
			const resData = parseJSONSeguro(res.data);

			if (resData && resData.success && resData.data) {
				const f = resData.data;
				const n = [...membros];
				if (f.nome) n[index].nome = f.nome;
				if (f.data_nascimento) n[index].nascimento = f.data_nascimento;
				if (f.nacionalidade) n[index].nacionalidade = f.nacionalidade;
				if (f.profissao) n[index].profissao = f.profissao;
				if (f.estado_civil) n[index].estadoCivil = f.estado_civil;
				if (f.naturalidade) n[index].naturalidade = f.naturalidade;
				if (f.rg) n[index].rg = f.rg;
				if (f.rg_expedicao) n[index].expedicao = f.rg_expedicao;
				if (f.rg_orgao) n[index].orgao = f.rg_orgao;
				if (f.telefone1) n[index].telefone1 = f.telefone1;
				if (f.telefone2) n[index].telefone2 = f.telefone2;
				if (f.email) n[index].email = f.email;
				setMembros(n);
				Alert.alert("Sucesso", "Dados do frequentador carregados automaticamente!");
			}
		} catch (error) {
			console.log("Erro na busca de CPF:", error);
		}
	};

	const handleExcluir = (id: number, eleicao: string) => {
		Alert.alert(
			"Confirmar Exclusão",
			`Deseja realmente excluir a Diretoria da eleição "${eleicao}"?`,
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir", style: "destructive",
					onPress: async () => {
						try {
							const response = await apiService.api.get(`api_excluir_diretoria.php?id=${id}`);
							const resData = parseJSONSeguro(response.data);
							if (resData && resData.success) {
								Alert.alert("Sucesso", "Diretoria excluída com sucesso!");
								carregarDiretorias();
							} else {
								Alert.alert("Erro ao excluir", resData?.message || "Falha.");
							}
						} catch (error) {
							Alert.alert("Erro", "Não foi possível comunicar com o servidor.");
						}
					}
				}
			]
		);
	};

	const handleGravar = async () => {
		if (!form.eleicao || !form.inicio) {
			Alert.alert('Atenção', 'Data de eleição e início são obrigatórios.');
			return;
		}

		for (let m of membros) {
			if (m.cpf && m.cpf.replace(/\D/g, '').length === 11 && !validarCPF(m.cpf)) {
				Alert.alert('Atenção', `O CPF ${m.cpf} do membro "${m.nome || 'Sem Nome'}" é inválido.`);
				return;
			}
		}

		setIsSaving(true);
		try {
			const payload = { id: idEditando, id_instituicao: casaId, form: form, membros: membros };
			const response = await apiService.api.post('api_salvar_diretoria.php', payload);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				Alert.alert("Sucesso!", resData.message);
				setModalVisivel(false);
				carregarDiretorias();
			} else {
				Alert.alert("Erro no Servidor", resData?.message || "Falha.");
			}
		} catch (error) {
			Alert.alert("Erro de Conexão", "Não foi possível comunicar com o servidor.");
		} finally {
			setIsSaving(false);
		}
	};

	const opcoesEstadoCivil = [
		{ label: 'Solteiro(a)', value: 'Solteiro(a)' },
		{ label: 'Casado(a)', value: 'Casado(a)' },
		{ label: 'Divorciado(a)', value: 'Divorciado(a)' },
		{ label: 'Viúvo(a)', value: 'Viúvo(a)' },
		{ label: 'Separado(a)', value: 'Separado(a)' }
	];

	const getDadosModalForm = () => {
		if (!modalFormAtivo) return [];
		let lista: any[] = [];
		if (modalFormAtivo.campo === 'estadoCivil') lista = opcoesEstadoCivil;
		else if (modalFormAtivo.campo === 'naturalidade') lista = cidadesDb;
		return [{ label: 'Selecione...', value: '' }, ...lista];
	};

	const handleSelecionarOpcaoForm = (valor: string) => {
		if (!modalFormAtivo || modalFormAtivo.index === undefined) return;
		const { campo, index } = modalFormAtivo;
		const n = [...membros];
		if (campo === 'estadoCivil') n[index].estadoCivil = valor;
		else if (campo === 'naturalidade') n[index].naturalidade = valor;
		setMembros(n);
		setModalFormAtivo(null);
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Diretoria - {casaNome}</Text>
				<View style={{ width: 48 }} />
			</View>

			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
				<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>

					<View style={styles.sectionContainer}>
						<Text style={styles.sectionTitle}>Filtros de Busca</Text>

						<View style={styles.row}>
							<View style={{ flex: 2, marginRight: 5 }}>
								<Text style={styles.label}>Data Inicial</Text>
								<MaskedTextInput mask="99/99/9999" style={styles.input} value={filtro.dataInicial} onChangeText={t => setFiltro({ ...filtro, dataInicial: t })} keyboardType="numeric" />
							</View>
							<View style={{ flex: 2, marginLeft: 5 }}>
								<Text style={styles.label}>Data Final</Text>
								<MaskedTextInput mask="99/99/9999" style={styles.input} value={filtro.dataFinal} onChangeText={t => setFiltro({ ...filtro, dataFinal: t })} keyboardType="numeric" />
							</View>
						</View>

						<View style={[styles.row, { marginTop: 10, gap: 10 }]}>
							<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#28a745' }]} onPress={abrirModalInserir}>
								<Feather name="plus" size={18} color="#fff" />
								<Text style={styles.btnActionText}>Inserir</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#007bff' }]} onPress={carregarDiretorias}>
								<Feather name="search" size={18} color="#fff" />
								<Text style={styles.btnActionText}>Buscar</Text>
							</TouchableOpacity>
						</View>
					</View>

					{isLoading ? (
						<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} />
					) : diretorias.length === 0 ? (
						<Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>Nenhuma diretoria cadastrada.</Text>
					) : (
						diretorias.map((item) => (
							<View key={item.id} style={styles.card}>
								<View style={styles.cardContent}>
									<Text style={styles.cardTitle}>Eleição: {item.eleicao}</Text>
									<Text style={styles.cardSub}>Mandato: <Text style={{ fontWeight: 'bold' }}>{item.inicio} a {item.fim}</Text></Text>
									<Text style={styles.cardSub}>Situação: <Text style={{ color: item.situacao === 'Ativa' ? '#28a745' : '#ED1C24', fontWeight: 'bold' }}>{item.situacao}</Text></Text>
								</View>
								<View style={styles.cardActions}>
									<TouchableOpacity style={styles.btnCardAction} onPress={() => abrirModalEditar(item.id)}>
										<Feather name="edit" size={18} color="#007bff" />
										<Text style={[styles.btnCardActionText, { color: '#007bff' }]}>Editar</Text>
									</TouchableOpacity>
									<View style={styles.divisorVertical} />
									<TouchableOpacity style={styles.btnCardAction} onPress={() => handleExcluir(item.id, item.eleicao)}>
										<Feather name="trash-2" size={18} color="#ED1C24" />
										<Text style={[styles.btnCardActionText, { color: '#ED1C24' }]}>Excluir</Text>
									</TouchableOpacity>
								</View>
							</View>
						))
					)}
				</ScrollView>
			</KeyboardAvoidingView>

			<Modal visible={modalVisivel} transparent animationType="slide">
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
					<View style={styles.modalOverlayBottom}>
						<View style={styles.modalContentBottom}>
							<View style={styles.modalHeaderBottom}>
								<Text style={[styles.headerTitleModal, { color: COR_PRIMARIA }]}>
									{idEditando ? 'Editar Diretoria' : 'Cadastrar Diretoria'}
								</Text>
								<TouchableOpacity onPress={() => setModalVisivel(false)} style={{ padding: 5 }}>
									<Feather name="x" size={26} color="#555" />
								</TouchableOpacity>
							</View>

							{isLoadingDetalhes ? (
								<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
									<ActivityIndicator size="large" color={COR_PRIMARIA} />
									<Text style={{ marginTop: 10, color: '#666' }}>Carregando dados da diretoria...</Text>
								</View>
							) : (
								<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
									<View style={styles.sectionContainer}>
										<Text style={styles.sectionTitle}>Mandato</Text>

										<Text style={styles.label}>Data da Eleição</Text>
										<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.eleicao} onChangeText={t => setForm({ ...form, eleicao: t })} />

										<View style={styles.row}>
											<View style={{ flex: 2, marginRight: 5 }}>
												<Text style={styles.label}>Data Inicial</Text>
												<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.inicio} onChangeText={t => setForm({ ...form, inicio: t })} />
											</View>
											<View style={{ flex: 2, marginLeft: 5 }}>
												<Text style={styles.label}>Data Final</Text>
												<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.fim} onChangeText={t => setForm({ ...form, fim: t })} />
											</View>
										</View>
									</View>

									<View style={styles.sectionContainer}>
										<Text style={styles.sectionTitle}>Membros da Diretoria</Text>
										{membros.map((item, index) => (
											<View key={item.id} style={styles.blocoDinamico}>
												<View style={styles.row}>
													<Text style={styles.label}>Membro {index + 1}</Text>
													{index > 0 && <TouchableOpacity onPress={() => setMembros(membros.filter(e => e.id !== item.id))}><Feather name="trash-2" size={18} color="#ED1C24" /></TouchableOpacity>}
												</View>

												<Text style={styles.label}>Cargo</Text>
												<TextInput style={styles.input} value={item.cargo} onChangeText={t => { const n = [...membros]; n[index].cargo = t; setMembros(n); }} />

												<Text style={styles.label}>CPF (Validação e Busca Automática)</Text>
												<View style={styles.row}>
													<MaskedTextInput mask="999.999.999-99" style={[styles.input, { flex: 4, marginRight: 10 }]} keyboardType="numeric" value={item.cpf} onChangeText={(_, raw) => { const n = [...membros]; n[index].cpf = raw; setMembros(n); }} onBlur={() => buscarMembroPorCPF(item.cpf, index)} />
													<TouchableOpacity style={styles.btnBuscaForm} onPress={() => buscarMembroPorCPF(item.cpf, index)}>
														<Feather name="search" size={20} color="#fff" />
													</TouchableOpacity>
												</View>

												<Text style={styles.label}>Nome Completo</Text>
												<TextInput style={styles.input} value={item.nome} onChangeText={t => { const n = [...membros]; n[index].nome = t; setMembros(n); }} />

												<View style={styles.row}>
													<View style={{ flex: 2, marginRight: 5 }}>
														<Text style={styles.label}>Nascimento</Text>
														<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={item.nascimento} onChangeText={t => { const n = [...membros]; n[index].nascimento = t; setMembros(n); }} />
													</View>
													<View style={{ flex: 2, marginLeft: 5 }}>
														<Text style={styles.label}>Nacionalidade</Text>
														<TextInput style={styles.input} value={item.nacionalidade} onChangeText={t => { const n = [...membros]; n[index].nacionalidade = t; setMembros(n); }} />
													</View>
												</View>

												<View style={styles.row}>
													<View style={{ flex: 2, marginRight: 5 }}>
														<Text style={styles.label}>Estado Civil</Text>
														<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFormAtivo({ campo: 'estadoCivil', index })} activeOpacity={0.7}>
															<Text style={{ fontSize: 14, color: item.estadoCivil ? '#000' : '#888', flex: 1 }}>{item.estadoCivil || 'Selecione...'}</Text>
															<Feather name="chevron-down" size={20} color="#000" />
														</TouchableOpacity>
													</View>
													<View style={{ flex: 2, marginLeft: 5 }}>
														<Text style={styles.label}>Naturalidade</Text>
														<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFormAtivo({ campo: 'naturalidade', index })} activeOpacity={0.7}>
															<Text style={{ fontSize: 14, color: item.naturalidade ? '#000' : '#888', flex: 1 }}>{item.naturalidade || 'Buscar...'}</Text>
															<Feather name="chevron-down" size={20} color="#000" />
														</TouchableOpacity>
													</View>
												</View>

												<Text style={styles.label}>Profissão</Text>
												<TextInput style={styles.input} value={item.profissao} onChangeText={t => { const n = [...membros]; n[index].profissao = t; setMembros(n); }} />

												<View style={styles.row}>
													<View style={{ flex: 2, marginRight: 5 }}>
														<Text style={styles.label}>RG</Text>
														<TextInput style={styles.input} keyboardType="numeric" value={item.rg} onChangeText={t => { const n = [...membros]; n[index].rg = t; setMembros(n); }} />
													</View>
													<View style={{ flex: 2, marginLeft: 5 }}>
														<Text style={styles.label}>Expedição</Text>
														<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={item.expedicao} onChangeText={t => { const n = [...membros]; n[index].expedicao = t; setMembros(n); }} />
													</View>
												</View>

												<Text style={styles.label}>Órgão Expeditor</Text>
												<TextInput style={styles.input} value={item.orgao} onChangeText={t => { const n = [...membros]; n[index].orgao = t; setMembros(n); }} />

												<View style={styles.row}>
													<View style={{ flex: 2, marginRight: 5 }}>
														<Text style={styles.label}>Telefone 1</Text>
														<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="numeric" value={item.telefone1} onChangeText={(_, raw) => { const n = [...membros]; n[index].telefone1 = raw; setMembros(n); }} />
													</View>
													<View style={{ flex: 2, marginLeft: 5 }}>
														<Text style={styles.label}>Telefone 2</Text>
														<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="numeric" value={item.telefone2} onChangeText={(_, raw) => { const n = [...membros]; n[index].telefone2 = raw; setMembros(n); }} />
													</View>
												</View>

												<Text style={styles.label}>E-mail</Text>
												<TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={item.email} onChangeText={t => { const n = [...membros]; n[index].email = t; setMembros(n); }} />
											</View>
										))}

										<TouchableOpacity style={styles.btnAddItem} onPress={() => setMembros([...membros, { ...templateMembro, id: Date.now() }])}>
											<Feather name="plus" size={18} color="#28a745" />
											<Text style={styles.btnAddItemText}>Adicionar Membro</Text>
										</TouchableOpacity>
									</View>

									<TouchableOpacity style={styles.btnSalvarFull} onPress={handleGravar} disabled={isSaving}>
										<Text style={styles.btnSalvarFullText}>{isSaving ? 'Gravando...' : 'Gravar Diretoria'}</Text>
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

								{modalFormAtivo.campo === 'naturalidade' && (
									<TextInput
										style={[styles.input, { height: 40, paddingVertical: 8, marginBottom: 10 }]}
										placeholder="Pesquisar cidade..."
										value={buscaCombo}
										onChangeText={setBuscaCombo}
									/>
								)}

								<FlatList
									data={getDadosModalForm().filter(item => item.label.toLowerCase().includes(buscaCombo.toLowerCase()))}
									keyExtractor={(item, index) => index.toString()}
									renderItem={({ item }) => {
										let isSelected = false;
										if (modalFormAtivo.index !== undefined) {
											if (modalFormAtivo.campo === 'estadoCivil') isSelected = membros[modalFormAtivo.index].estadoCivil === item.value;
											else if (modalFormAtivo.campo === 'naturalidade') isSelected = membros[modalFormAtivo.index].naturalidade === item.value;
										}
										return (
											<TouchableOpacity style={styles.modalItem} onPress={() => handleSelecionarOpcaoForm(item.value)}>
												<Text style={[styles.modalItemText, isSelected && { color: COR_PRIMARIA, fontWeight: 'bold' }]}>{item.label}</Text>
												{isSelected && <Feather name="check" size={18} color={COR_PRIMARIA} />}
											</TouchableOpacity>
										);
									}}
								/>
							</View>
						</TouchableOpacity>
					)}
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f4f6f8' },
	scrollContent: { flex: 1, backgroundColor: '#f4f6f8' },

	headerBar: { height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20), paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight, backgroundColor: COR_PRIMARIA, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, elevation: 5, zIndex: 10 },
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },

	sectionContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 20 },
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
	input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#000', marginBottom: 15 },
	row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	pickerWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#f9f9f9', marginBottom: 15, paddingHorizontal: 15, minHeight: 48 },
	btnBuscaForm: { backgroundColor: '#28a745', height: 48, width: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
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

	btnSalvarFull: { backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10 },
	btnSalvarFullText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

	modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContentBottom: { backgroundColor: '#f4f6f8', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
	modalHeaderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' },
	headerTitleModal: { fontSize: 18, fontWeight: 'bold' },

	pseudoModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20, zIndex: 9999 },
	modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 },
	modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
	modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
	modalItemText: { fontSize: 15, color: '#333' }
});