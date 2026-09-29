import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { apiService } from '../../src/services/apiService';
import MenuLateral from '@/components/MenuLateral';

const COR_PRIMARIA = '#1B2669';
const COR_FUNDO = '#F4F6F8';
const TODAS_AS_CASAS = 'TODAS AS CASAS';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	const texto = String(resposta || '').trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const inicio = texto.indexOf('{');
		const fim = texto.lastIndexOf('}');
		if (inicio !== -1 && fim !== -1) return JSON.parse(texto.substring(inicio, fim + 1));
	} catch (e) { }
	return null;
};

const normalizar = (valor: any) => String(valor || '').trim().toUpperCase();

const valorParam = (valor: any) => Array.isArray(valor) ? valor[0] : valor;

const obterIdUsuario = (user: any) =>
	Number(user?.id ?? user?.id_usuario ?? user?.usuario_id ?? 0);

const obterIdFrequentador = (user: any) =>
	Number(user?.id_frequentador ?? user?.frequentador_id ?? 0);

type Opcao = {
	label: string;
	value: string | number;
	sub?: string;
};

export default function TurmasScreen() {
	const navigation = useNavigation();
	const params = useLocalSearchParams<any>();

	const idAtividade = Number(
		valorParam(params.idAtividade ?? params.id_atividade ?? params.atividade_id ?? params.id) || 0
	);
	const atividadeNome = String(
		valorParam(params.atividade ?? params.nomeAtividade ?? params.nome_atividade) || ''
	);
	const atividadeInstituicao = String(
		valorParam(params.instituicao ?? params.atividadeInstituicao ?? params.atividade_instituicao) || ''
	);
	const abrirNovoAutomatico = String(valorParam(params.novo) || '') === '1';

	const [usuario, setUsuario] = useState<any>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [turmas, setTurmas] = useState<any[]>([]);
	const [frequentadores, setFrequentadores] = useState<Opcao[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const [periodoFiltro, setPeriodoFiltro] = useState('');
	const [statusFiltro, setStatusFiltro] = useState('');
	const [statusEdicao, setStatusEdicao] = useState('CURSANDO');

	const [modalInserir, setModalInserir] = useState(false);
	const [idTurmaEditando, setIdTurmaEditando] = useState<number>(0);
	const [selecaoAtiva, setSelecaoAtiva] = useState<'status' | 'statusEdicao' | 'coordenador' | 'subcoordenador' | 'dia' | null>(null);
	const [buscaPessoa, setBuscaPessoa] = useState('');

	const [form, setForm] = useState({
		periodo: '',
		idCoordenador: 0,
		idSubcoordenador: 0,
		diaSemana: '',
		horaInicial: '',
		horaFinal: '',
	});

	const opcoesStatus: Opcao[] = [
		{ label: 'Todos', value: '' },
		{ label: 'Cursando', value: 'CURSANDO' },
		{ label: 'Finalizado', value: 'FINALIZADO' },
	];

	const opcoesDia: Opcao[] = [
		{ label: 'Domingo', value: 'Domingo' },
		{ label: 'Segunda-feira', value: 'Segunda-feira' },
		{ label: 'Terça-feira', value: 'Terça-feira' },
		{ label: 'Quarta-feira', value: 'Quarta-feira' },
		{ label: 'Quinta-feira', value: 'Quinta-feira' },
		{ label: 'Sexta-feira', value: 'Sexta-feira' },
		{ label: 'Sábado', value: 'Sábado' },
	];

	const buscarTurmas = async (usuarioAtual?: any) => {
		const user = usuarioAtual || usuario;
		if (!user || !idAtividade) return;

		setLoading(true);
		try {
			const qs =
				`id_atividade=${idAtividade}` +
				`&id_usuario=${obterIdUsuario(user)}` +
				`&id_frequentador=${obterIdFrequentador(user)}` +
				`&periodo=${encodeURIComponent(periodoFiltro.trim())}` +
				`&status=${encodeURIComponent(statusFiltro)}`;

			const response = await apiService.api.get(`api_listar_turmas.php?${qs}`);
			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				setTurmas(Array.isArray(dados.data) ? dados.data : []);
			} else {
				setTurmas([]);
				Alert.alert('Atenção', dados?.message || 'Não foi possível listar as turmas.');
			}
		} catch (error) {
			Alert.alert('Erro', 'Falha ao consultar as turmas.');
		} finally {
			setLoading(false);
		}
	};

	const carregarFrequentadores = async (user: any) => {
		try {
			const codigo = String(user.codigo_casa || '');
			const nivel = String(user.nivel_acesso || '');

			const response = await apiService.api.get(
				`api_listar_frequentadores.php?codigo_casa=${encodeURIComponent(codigo)}&nivel=${encodeURIComponent(nivel)}`
			);
			const dados = parseJSONSeguro(response.data);

			if (!dados?.success || !Array.isArray(dados.data)) {
				setFrequentadores([]);
				return;
			}

			let lista = dados.data.filter((f: any) => normalizar(f.situacao) === 'ATIVO');

			const atividadeEhGeral = normalizar(atividadeInstituicao) === TODAS_AS_CASAS || !atividadeInstituicao.trim();

			if (normalizar(nivel) === 'ADMINISTRADOR' && !atividadeEhGeral) {
				lista = lista.filter((f: any) => normalizar(f.instituicao) === normalizar(atividadeInstituicao));
			}

			setFrequentadores(
				lista.map((f: any) => ({
					label: String(f.nome || ''),
					value: Number(f.id),
					sub: f.cpf ? `CPF: ${f.cpf}` : '',
				}))
			);
		} catch (error) {
			setFrequentadores([]);
		}
	};

	const carregarTela = async () => {
		const session = await AsyncStorage.getItem('@user_session');
		if (!session) {
			router.replace('/');
			return;
		}

		const user = JSON.parse(session);
		setUsuario(user);

		if (idAtividade <= 0) {
			Alert.alert('Erro', 'Atividade não encontrada.');
			return;
		}

		await Promise.all([
			carregarFrequentadores(user),
			buscarTurmas(user),
		]);

		if (abrirNovoAutomatico) {
			setIdTurmaEditando(0);
			setForm({
				periodo: '',
				idCoordenador: 0,
				idSubcoordenador: 0,
				diaSemana: '',
				horaInicial: '',
				horaFinal: '',
			});
			setModalInserir(true);
			router.setParams({ novo: undefined } as any);
		}
	};

	useFocusEffect(
		useCallback(() => {
			navigation.setOptions({ headerShown: false });
			carregarTela();
		}, [navigation, idAtividade])
	);

	const abrirInserir = () => {
		setIdTurmaEditando(0);
		setStatusFiltro(statusFiltro);
		setForm({
			periodo: '',
			idCoordenador: 0,
			idSubcoordenador: 0,
			diaSemana: '',
			horaInicial: '',
			horaFinal: '',
		});
		setModalInserir(true);
	};

	const abrirEditar = (item: any) => {
		setIdTurmaEditando(Number(item.id_turma || 0));
		setForm({
			periodo: String(item.periodo || ''),
			idCoordenador: Number(item.id_coordenador || 0),
			idSubcoordenador: Number(item.id_subcoordenador || 0),
			diaSemana: String(item.dia_semana || ''),
			horaInicial: String(item.hora_inicial || '').slice(0, 5),
			horaFinal: String(item.hora_final || '').slice(0, 5),
		});
		setStatusEdicao(String(item.status || 'CURSANDO').toUpperCase());
		setModalInserir(true);
	};

	const abrirMatriculas = (item: any) => {
		router.push({
			pathname: '/admin/turma-matriculas',
			params: { idTurma: String(item.id_turma) }
		} as any);
	};

	const abrirFrequencia = (item: any) => {
		router.push({
			pathname: '/admin/turma-frequencia',
			params: { idTurma: String(item.id_turma) }
		} as any);
	};

	const validarHora = (hora: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

	const salvarTurma = async () => {
		if (!form.periodo.trim()) {
			Alert.alert('Atenção', 'Informe o período da turma.');
			return;
		}
		if (!form.idCoordenador) {
			Alert.alert('Atenção', 'Selecione o coordenador.');
			return;
		}
		if (!form.diaSemana) {
			Alert.alert('Atenção', 'Selecione o dia da semana.');
			return;
		}
		if (!validarHora(form.horaInicial) || !validarHora(form.horaFinal)) {
			Alert.alert('Atenção', 'Informe os horários no formato HH:MM.');
			return;
		}
		if (form.horaFinal <= form.horaInicial) {
			Alert.alert('Atenção', 'A hora final deve ser posterior à hora inicial.');
			return;
		}

		const idUsuario = obterIdUsuario(usuario);
		const idFrequentador = obterIdFrequentador(usuario);

		if (idAtividade <= 0) {
			Alert.alert('Erro', 'Atividade não encontrada.');
			return;
		}

		if (idUsuario <= 0 && idFrequentador <= 0) {
			Alert.alert('Erro', 'Usuário não identificado.');
			return;
		}

		setSaving(true);
		try {
			const payload = {
				id_turma: idTurmaEditando,
				id_usuario: idUsuario,
				id_frequentador: idFrequentador,
				id_atividade: idAtividade,
				idAtividade: idAtividade,
				status: idTurmaEditando > 0 ? statusEdicao : 'CURSANDO',
				periodo: form.periodo.trim(),
				id_coordenador: form.idCoordenador,
				id_subcoordenador: form.idSubcoordenador || 0,
				dia_semana: form.diaSemana,
				hora_inicial: form.horaInicial,
				hora_final: form.horaFinal,
			};

			const response = await apiService.api.post('api_salvar_turma.php', payload);
			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				Alert.alert('Sucesso', idTurmaEditando > 0 ? 'Turma atualizada.' : 'Turma cadastrada.');
				setModalInserir(false);
				await buscarTurmas();
			} else {
				Alert.alert('Erro', dados?.message || 'Não foi possível salvar a turma.');
			}
		} catch (error) {
			Alert.alert('Erro', 'Falha na comunicação com o servidor.');
		} finally {
			setSaving(false);
		}
	};

	const nomePessoa = (id: number) =>
		frequentadores.find(item => Number(item.value) === Number(id))?.label || '';

	const dadosSelecao = useMemo(() => {
		if (selecaoAtiva === 'status' || selecaoAtiva === 'statusEdicao') return opcoesStatus.filter(o => o.value !== '');
		if (selecaoAtiva === 'dia') return opcoesDia;

		if (selecaoAtiva === 'coordenador' || selecaoAtiva === 'subcoordenador') {
			const termo = buscaPessoa.trim().toLowerCase();
			const base = selecaoAtiva === 'subcoordenador'
				? [{ label: 'Sem sub-coordenador', value: 0 }, ...frequentadores]
				: frequentadores;

			if (!termo) return base;

			return base.filter(item =>
				item.label.toLowerCase().includes(termo) ||
				String(item.sub || '').toLowerCase().includes(termo)
			);
		}

		return [];
	}, [selecaoAtiva, buscaPessoa, frequentadores]);

	const selecionarOpcao = (opcao: Opcao) => {
		if (selecaoAtiva === 'status') {
			setStatusFiltro(String(opcao.value));
		} else if (selecaoAtiva === 'statusEdicao') {
			setStatusEdicao(String(opcao.value));
		} else if (selecaoAtiva === 'dia') {
			setForm(prev => ({ ...prev, diaSemana: String(opcao.value) }));
		} else if (selecaoAtiva === 'coordenador') {
			const id = Number(opcao.value);
			if (id && id === form.idSubcoordenador) {
				Alert.alert('Atenção', 'Coordenador e sub-coordenador devem ser pessoas diferentes.');
				return;
			}
			setForm(prev => ({ ...prev, idCoordenador: id }));
		} else if (selecaoAtiva === 'subcoordenador') {
			const id = Number(opcao.value);
			if (id && id === form.idCoordenador) {
				Alert.alert('Atenção', 'Coordenador e sub-coordenador devem ser pessoas diferentes.');
				return;
			}
			setForm(prev => ({ ...prev, idSubcoordenador: id }));
		}

		setBuscaPessoa('');
		setSelecaoAtiva(null);
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.header}>
				<TouchableOpacity style={styles.headerButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<View style={{ flex: 1 }}>
					<Text style={styles.headerTitle}>Turmas</Text>
					<Text style={styles.headerSub} numberOfLines={1}>{atividadeNome || 'Atividade'}</Text>
				</View>
				<View style={styles.headerButton} />
			</View>

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
					<View style={styles.filterCard}>
						<Text style={styles.label}>Período</Text>
						<TextInput
							style={styles.input}
							value={periodoFiltro}
							onChangeText={setPeriodoFiltro}
							placeholder="Ex.: 2026.2, Janeiro a Junho..."
						/>

						<Text style={styles.label}>Status</Text>
						<TouchableOpacity style={styles.selector} onPress={() => setSelecaoAtiva('status')}>
							<Text style={styles.selectorText}>
								{opcoesStatus.find(o => o.value === statusFiltro)?.label || 'Todos'}
							</Text>
							<Feather name="chevron-down" size={20} color="#555" />
						</TouchableOpacity>

						<View style={styles.actionRow}>
							<TouchableOpacity style={[styles.actionButton, styles.searchButton]} onPress={() => buscarTurmas()}>
								<Feather name="search" size={18} color="#FFF" />
								<Text style={styles.actionButtonText}>Buscar</Text>
							</TouchableOpacity>

							<TouchableOpacity style={[styles.actionButton, styles.insertButton]} onPress={abrirInserir}>
								<Feather name="plus" size={18} color="#FFF" />
								<Text style={styles.actionButtonText}>Inserir</Text>
							</TouchableOpacity>
						</View>
					</View>

					{loading ? (
						<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} />
					) : turmas.length === 0 ? (
						<Text style={styles.emptyText}>Nenhuma turma encontrada para esta atividade.</Text>
					) : (
						turmas.map((item: any) => (
							<View key={String(item.id_turma)} style={styles.card}>
								<Text style={styles.cardTitle}>{item.atividade}</Text>

								<View style={styles.line}>
									<Text style={styles.lineLabel}>Período:</Text>
									<Text style={styles.lineValue}>{item.periodo || '-'}</Text>
								</View>
								<View style={styles.line}>
									<Text style={styles.lineLabel}>Dia da semana:</Text>
									<Text style={styles.lineValue}>{item.dia_semana || '-'}</Text>
								</View>
								<View style={styles.line}>
									<Text style={styles.lineLabel}>Horário:</Text>
									<Text style={styles.lineValue}>{item.hora_inicial} às {item.hora_final}</Text>
								</View>
								<View style={styles.line}>
									<Text style={styles.lineLabel}>Coordenador:</Text>
									<Text style={styles.lineValue}>{item.coordenador || '-'}</Text>
								</View>
								<View style={styles.line}>
									<Text style={styles.lineLabel}>Sub-coordenador:</Text>
									<Text style={styles.lineValue}>{item.subcoordenador || '-'}</Text>
								</View>
								<View style={styles.line}>
									<Text style={styles.lineLabel}>ID Turma:</Text>
									<Text style={styles.lineValue}>{item.id_turma}</Text>
								</View>
								<View style={styles.line}>
									<Text style={styles.lineLabel}>Situação:</Text>
									<Text style={[
										styles.statusText,
										{ color: normalizar(item.status) === 'CURSANDO' ? '#2E7D32' : '#6B7280' }
									]}>
										{item.status}
									</Text>
								</View>

								<View style={styles.cardActions}>
									<TouchableOpacity style={styles.cardAction} onPress={() => abrirEditar(item)}>
										<Ionicons name="create-outline" size={20} color="#0D6EFD" />
										<Text style={[styles.cardActionText, { color: '#0D6EFD' }]}>Editar</Text>
									</TouchableOpacity>
									<TouchableOpacity style={styles.cardAction} onPress={() => abrirMatriculas(item)}>
										<Ionicons name="person-add-outline" size={20} color="#6F42C1" />
										<Text style={[styles.cardActionText, { color: '#6F42C1' }]}>Matrícula</Text>
									</TouchableOpacity>
									<TouchableOpacity style={styles.cardAction} onPress={() => abrirFrequencia(item)}>
										<Ionicons name="checkbox-outline" size={20} color="#198754" />
										<Text style={[styles.cardActionText, { color: '#198754' }]}>Frequência</Text>
									</TouchableOpacity>
								</View>
							</View>
						))
					)}

					<View style={{ height: 30 }} />
				</ScrollView>
			</KeyboardAvoidingView>

			<Modal visible={modalInserir} transparent animationType="slide" onRequestClose={() => setModalInserir(false)}>
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
					<View style={styles.bottomOverlay}>
						<View style={styles.bottomModal}>
							<View style={styles.modalHeader}>
								<View>
									<Text style={styles.modalTitle}>{idTurmaEditando > 0 ? 'Editar Turma' : 'Cadastrar Turma'}</Text>
									<Text style={styles.modalSub} numberOfLines={1}>{atividadeNome}</Text>
								</View>
								<TouchableOpacity onPress={() => setModalInserir(false)} style={{ padding: 6 }}>
									<Feather name="x" size={26} color="#555" />
								</TouchableOpacity>
							</View>

							<ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
								<Text style={styles.label}>Período *</Text>
								<TextInput
									style={styles.input}
									value={form.periodo}
									onChangeText={periodo => setForm({ ...form, periodo })}
									placeholder="Ex.: 2026.2"
								/>

								<Text style={styles.label}>Coordenador *</Text>
								<TouchableOpacity style={styles.selector} onPress={() => setSelecaoAtiva('coordenador')}>
									<Text style={[styles.selectorText, !form.idCoordenador && styles.placeholder]}>
										{nomePessoa(form.idCoordenador) || 'Selecione o coordenador'}
									</Text>
									<Feather name="chevron-down" size={20} color="#555" />
								</TouchableOpacity>

								<Text style={styles.label}>Sub-coordenador</Text>
								<TouchableOpacity style={styles.selector} onPress={() => setSelecaoAtiva('subcoordenador')}>
									<Text style={[styles.selectorText, !form.idSubcoordenador && styles.placeholder]}>
										{nomePessoa(form.idSubcoordenador) || 'Sem sub-coordenador'}
									</Text>
									<Feather name="chevron-down" size={20} color="#555" />
								</TouchableOpacity>

								<Text style={styles.label}>Dia da semana *</Text>
								<TouchableOpacity style={styles.selector} onPress={() => setSelecaoAtiva('dia')}>
									<Text style={[styles.selectorText, !form.diaSemana && styles.placeholder]}>
										{form.diaSemana || 'Selecione o dia'}
									</Text>
									<Feather name="chevron-down" size={20} color="#555" />
								</TouchableOpacity>

								<View style={styles.timeRow}>
									<View style={{ flex: 1, marginRight: 6 }}>
										<Text style={styles.label}>Hora inicial *</Text>
										<MaskedTextInput
											mask="99:99"
											style={styles.input}
											keyboardType="numeric"
											value={form.horaInicial}
											onChangeText={horaInicial => setForm({ ...form, horaInicial })}
											placeholder="00:00"
										/>
									</View>
									<View style={{ flex: 1, marginLeft: 6 }}>
										<Text style={styles.label}>Hora final *</Text>
										<MaskedTextInput
											mask="99:99"
											style={styles.input}
											keyboardType="numeric"
											value={form.horaFinal}
											onChangeText={horaFinal => setForm({ ...form, horaFinal })}
											placeholder="00:00"
										/>
									</View>
								</View>

								{idTurmaEditando > 0 && (
									<>
										<Text style={styles.label}>Status *</Text>
										<TouchableOpacity style={styles.selector} onPress={() => setSelecaoAtiva('statusEdicao')}>
											<Text style={styles.selectorText}>
												{statusEdicao === 'FINALIZADO' ? 'Finalizado' : 'Cursando'}
											</Text>
											<Feather name="chevron-down" size={20} color="#555" />
										</TouchableOpacity>
									</>
								)}

								{idTurmaEditando === 0 && (
									<View style={styles.infoBox}>
										<Ionicons name="information-circle-outline" size={20} color={COR_PRIMARIA} />
										<Text style={styles.infoText}>Nova turma inicia como CURSANDO.</Text>
									</View>
								)}

								<TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={salvarTurma} disabled={saving}>
									{saving ? <ActivityIndicator color="#FFF" /> : (
										<>
											<Feather name="save" size={19} color="#FFF" />
											<Text style={styles.saveText}>{idTurmaEditando > 0 ? 'Salvar Alterações' : 'Gravar Turma'}</Text>
										</>
									)}
								</TouchableOpacity>
							</ScrollView>
						</View>
					</View>

					{!!selecaoAtiva && selecaoAtiva !== 'status' && (
						<View style={styles.innerSelectorOverlay}>
							<View style={styles.selectorModal}>
								<View style={styles.selectorHeader}>
									<Text style={styles.selectorTitle}>
										{selecaoAtiva === 'dia'
											? 'Dia da semana'
											: selecaoAtiva === 'statusEdicao'
												? 'Status'
												: selecaoAtiva === 'coordenador'
													? 'Coordenador'
													: 'Sub-coordenador'}
									</Text>
									<TouchableOpacity onPress={() => { setBuscaPessoa(''); setSelecaoAtiva(null); }}>
										<Feather name="x" size={24} color="#555" />
									</TouchableOpacity>
								</View>

								{(selecaoAtiva === 'coordenador' || selecaoAtiva === 'subcoordenador') && (
									<View style={styles.searchBox}>
										<Feather name="search" size={18} color="#777" />
										<TextInput
											style={styles.searchInput}
											value={buscaPessoa}
											onChangeText={setBuscaPessoa}
											placeholder="Buscar frequentador..."
											autoFocus
										/>
									</View>
								)}

								<FlatList
									data={dadosSelecao}
									keyExtractor={(item, index) => `${item.value}-${index}`}
									keyboardShouldPersistTaps="handled"
									ListEmptyComponent={
										<Text style={styles.emptySelectorText}>
											{(selecaoAtiva === 'coordenador' || selecaoAtiva === 'subcoordenador')
												? 'Nenhum frequentador disponível.'
												: 'Nenhuma opção disponível.'}
										</Text>
									}
									renderItem={({ item }) => (
										<TouchableOpacity style={styles.optionItem} onPress={() => selecionarOpcao(item)}>
											<View style={{ flex: 1 }}>
												<Text style={styles.optionText}>{item.label}</Text>
												{!!item.sub && <Text style={styles.optionSub}>{item.sub}</Text>}
											</View>
											<Feather name="chevron-right" size={18} color="#AAA" />
										</TouchableOpacity>
									)}
								/>
							</View>
						</View>
					)}
				</KeyboardAvoidingView>
			</Modal>

			<Modal
				visible={selecaoAtiva === 'status'}
				transparent
				animationType="fade"
				onRequestClose={() => setSelecaoAtiva(null)}
			>
				<View style={styles.centerOverlay}>
					<View style={styles.selectorModal}>
						<View style={styles.selectorHeader}>
							<Text style={styles.selectorTitle}>Status</Text>
							<TouchableOpacity onPress={() => setSelecaoAtiva(null)}>
								<Feather name="x" size={24} color="#555" />
							</TouchableOpacity>
						</View>

						<FlatList
							data={opcoesStatus}
							keyExtractor={(item, index) => `${item.value}-${index}`}
							keyboardShouldPersistTaps="handled"
							renderItem={({ item }) => (
								<TouchableOpacity style={styles.optionItem} onPress={() => selecionarOpcao(item)}>
									<View style={{ flex: 1 }}>
										<Text style={styles.optionText}>{item.label}</Text>
									</View>
									<Feather name="chevron-right" size={18} color="#AAA" />
								</TouchableOpacity>
							)}
						/>
					</View>
				</View>
			</Modal>

			<MenuLateral
				isOpen={isMenuOpen}
				onClose={() => setIsMenuOpen(false)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	header: {
		backgroundColor: COR_PRIMARIA,
		paddingTop: Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight || 24) + 8,
		paddingBottom: 12,
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerButton: { width: 46, padding: 10 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
	headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'center', marginTop: 2 },
	content: { padding: 15 },
	filterCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E1E5EA', marginBottom: 15 },
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 15 },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 6 },
	input: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#DADDE1', borderRadius: 8, minHeight: 48, paddingHorizontal: 13, color: '#222', marginBottom: 14 },
	selector: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#DADDE1', borderRadius: 8, minHeight: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
	selectorText: { flex: 1, color: '#222', fontSize: 14 },
	placeholder: { color: '#999' },
	actionRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
	actionButton: { flex: 1, height: 46, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
	searchButton: { backgroundColor: '#007BFF' },
	insertButton: { backgroundColor: '#28A745' },
	actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
	emptyText: { color: '#777', textAlign: 'center', marginTop: 35 },
	card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#DFE3E7', marginBottom: 10 },
	cardTitle: { color: '#2D3748', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
	cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEE', marginTop: 12, paddingTop: 8 },
	cardAction: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
	cardActionText: { fontSize: 11, fontWeight: 'bold', marginTop: 3 },
	line: { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
	lineLabel: { width: 125, color: '#68707B', fontSize: 13, fontWeight: '600' },
	lineValue: { flex: 1, color: '#333', fontSize: 13 },
	statusText: { flex: 1, fontSize: 13, fontWeight: 'bold' },
	bottomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
	bottomModal: { backgroundColor: COR_FUNDO, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
	modalHeader: { backgroundColor: '#FFF', padding: 18, borderTopLeftRadius: 20, borderTopRightRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E4E4E4' },
	modalTitle: { fontSize: 18, color: COR_PRIMARIA, fontWeight: 'bold' },
	modalSub: { fontSize: 12, color: '#777', marginTop: 3, maxWidth: 280 },
	timeRow: { flexDirection: 'row' },
	infoBox: { flexDirection: 'row', backgroundColor: '#EAF0FF', borderWidth: 1, borderColor: '#CFD9F7', borderRadius: 9, padding: 12, marginBottom: 15 },
	infoText: { flex: 1, color: '#45516F', fontSize: 12, lineHeight: 18, marginLeft: 8 },
	saveButton: { backgroundColor: '#28A745', minHeight: 54, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 5, marginBottom: 25 },
	saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
	centerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
	innerSelectorOverlay: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(0,0,0,0.55)',
		justifyContent: 'center',
		padding: 20,
		zIndex: 9999,
		elevation: 9999,
	},
	selectorModal: { backgroundColor: '#FFF', borderRadius: 15, padding: 16, maxHeight: '78%' },
	selectorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 12, marginBottom: 10 },
	selectorTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
	searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 8 },
	searchInput: { flex: 1, height: 44, paddingHorizontal: 8, color: '#222' },
	optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
	optionText: { fontSize: 14, color: '#333', fontWeight: '600' },
	optionSub: { fontSize: 11, color: '#888', marginTop: 2 },
	emptySelectorText: { textAlign: 'center', color: '#777', paddingVertical: 25, fontSize: 13 },
});
