import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Platform,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { apiService } from '../../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_FUNDO = '#F4F6F8';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	const texto = String(resposta || '').trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const i = texto.indexOf('{');
		const f = texto.lastIndexOf('}');
		if (i !== -1 && f !== -1) return JSON.parse(texto.substring(i, f + 1));
	} catch (e) { }
	return null;
};
const valorParam = (valor: any) => Array.isArray(valor) ? valor[0] : valor;

const obterIdUsuario = (user: any) =>
	Number(user?.id ?? user?.id_usuario ?? user?.usuario_id ?? 0);

const obterIdFrequentador = (user: any) =>
	Number(user?.id_frequentador ?? user?.frequentador_id ?? 0);


export default function TurmaMatriculasScreen() {
	const navigation = useNavigation();
	const params = useLocalSearchParams<any>();
	const idTurma = Number(valorParam(params.idTurma ?? params.id_turma ?? params.turma_id ?? params.id) || 0);

	const [usuario, setUsuario] = useState<any>(null);
	const [turma, setTurma] = useState<any>(null);
	const [matriculados, setMatriculados] = useState<any[]>([]);
	const [candidatos, setCandidatos] = useState<any[]>([]);
	const [busca, setBusca] = useState('');
	const [buscaRealizada, setBuscaRealizada] = useState(false);
	const [selecionado, setSelecionado] = useState<number>(0);
	const [loading, setLoading] = useState(false);
	const [loadingBusca, setLoadingBusca] = useState(false);
	const [saving, setSaving] = useState(false);
	const buscaSeqRef = useRef(0);

	const carregar = async (userParam?: any, termoParam?: string) => {
		const user = userParam || usuario;
		if (!user || !idTurma) return;

		setLoading(true);
		try {
			const idUsuario = obterIdUsuario(user);
			const idFrequentador = obterIdFrequentador(user);
			const termo = termoParam !== undefined ? termoParam : busca;
			setBuscaRealizada(termo.trim().length > 0);

			const response = await apiService.api.get(
				`api_matriculas_turma.php?id_usuario=${idUsuario}&id_frequentador=${idFrequentador}&id_turma=${idTurma}&busca=${encodeURIComponent(termo.trim())}`
			);
			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				setTurma(dados.turma || null);
				setMatriculados(Array.isArray(dados.matriculados) ? dados.matriculados : []);
				setCandidatos(Array.isArray(dados.candidatos) ? dados.candidatos : []);
				if (!dados.candidatos?.some((c: any) => Number(c.id_frequentador) === selecionado)) {
					setSelecionado(0);
				}
			} else {
				Alert.alert('Atenção', dados?.message || 'Não foi possível carregar a turma.');
			}
		} catch (error) {
			Alert.alert('Erro', 'Falha na comunicação com o servidor.');
		} finally {
			setLoading(false);
		}
	};

	const iniciar = async () => {
		const session = await AsyncStorage.getItem('@user_session');
		if (!session) {
			router.replace('/');
			return;
		}
		const user = JSON.parse(session);
		setUsuario(user);
		await carregar(user, '');
	};

	useFocusEffect(
		useCallback(() => {
			navigation.setOptions({ headerShown: false });
			iniciar();
		}, [navigation, idTurma])
	);

	const buscarCandidatos = async (termo: string) => {
		const user = usuario;
		const pesquisa = termo.trim();

		if (!user || !idTurma) return;

		if (!pesquisa) {
			buscaSeqRef.current += 1;
			setCandidatos([]);
			setSelecionado(0);
			setBuscaRealizada(false);
			setLoadingBusca(false);
			return;
		}

		const seq = ++buscaSeqRef.current;
		setBuscaRealizada(true);
		setLoadingBusca(true);

		try {
			const idUsuario = obterIdUsuario(user);
			const idFrequentador = obterIdFrequentador(user);

			const response = await apiService.api.get(
				`api_matriculas_turma.php?id_usuario=${idUsuario}&id_frequentador=${idFrequentador}&id_turma=${idTurma}&busca=${encodeURIComponent(pesquisa)}`
			);

			const dados = parseJSONSeguro(response.data);

			// Ignora resposta antiga caso o usuário já tenha digitado outra coisa.
			if (seq !== buscaSeqRef.current) return;

			if (dados?.success) {
				const lista = Array.isArray(dados.candidatos) ? dados.candidatos : [];
				setCandidatos(lista);

				if (!lista.some((c: any) => Number(c.id_frequentador) === selecionado)) {
					setSelecionado(0);
				}
			} else {
				setCandidatos([]);
				setSelecionado(0);
			}
		} catch (error) {
			if (seq === buscaSeqRef.current) {
				setCandidatos([]);
				setSelecionado(0);
			}
		} finally {
			if (seq === buscaSeqRef.current) {
				setLoadingBusca(false);
			}
		}
	};

	useEffect(() => {
		if (!usuario) return;

		const termo = busca.trim();

		if (!termo) {
			buscaSeqRef.current += 1;
			setCandidatos([]);
			setSelecionado(0);
			setBuscaRealizada(false);
			setLoadingBusca(false);
			return;
		}

		const timer = setTimeout(() => {
			buscarCandidatos(termo);
		}, 300);

		return () => clearTimeout(timer);
	}, [busca, usuario, idTurma]);


	const incluir = async () => {
		if (!selecionado) {
			Alert.alert('Atenção', 'Selecione um frequentador para incluir.');
			return;
		}

		setSaving(true);
		try {
			const response = await apiService.api.post('api_incluir_frequentador_turma.php', {
				id_usuario: obterIdUsuario(usuario),
				id_frequentador_sessao: obterIdFrequentador(usuario),
				id_turma: idTurma,
				id_frequentador: selecionado,
			});
			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				Alert.alert('Sucesso', dados.message || 'Frequentador incluído.');
				setSelecionado(0);
				setBusca('');
				setBuscaRealizada(false);
				await carregar(undefined, '');
			} else {
				Alert.alert('Erro', dados?.message || 'Não foi possível incluir o frequentador.');
			}
		} catch (error) {
			Alert.alert('Erro', 'Falha na comunicação com o servidor.');
		} finally {
			setSaving(false);
		}
	};

	const HeaderTurma = () => !turma ? null : (
		<View style={styles.headerCard}>
			<Text style={styles.headerCardTitle}>Turma #{turma.id_turma}</Text>
			<View style={styles.row}><Text style={styles.key}>Atividade:</Text><Text style={styles.value}>{turma.atividade}</Text></View>
			<View style={styles.row}><Text style={styles.key}>Período:</Text><Text style={styles.value}>{turma.periodo}</Text></View>
			<View style={styles.row}><Text style={styles.key}>Coordenador:</Text><Text style={styles.value}>{turma.coordenador || '-'}</Text></View>
			<View style={styles.row}><Text style={styles.key}>Sub-coordenador:</Text><Text style={styles.value}>{turma.subcoordenador || '-'}</Text></View>
			<View style={styles.row}><Text style={styles.key}>Dia da semana:</Text><Text style={styles.value}>{turma.dia_semana}</Text></View>
			<View style={styles.row}><Text style={styles.key}>Horário:</Text><Text style={styles.value}>{turma.hora_inicial} às {turma.hora_final}</Text></View>
		</View>
	);

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />
			<View style={styles.topHeader}>
				<TouchableOpacity style={styles.back} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.topTitle}>Matrículas da Turma</Text>
				<View style={styles.back} />
			</View>

			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				<HeaderTurma />

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Incluir Frequentador</Text>
					<View style={styles.searchBox}>
						<Ionicons name="search-outline" size={20} color="#777" />
						<TextInput
							style={styles.searchInput}
							value={busca}
							onChangeText={setBusca}
							placeholder="Digite nome, CPF, telefone ou e-mail"
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{loadingBusca && <ActivityIndicator size="small" color={COR_PRIMARIA} />}
						{!!busca && !loadingBusca && (
							<TouchableOpacity
								onPress={() => setBusca('')}
								style={styles.clearSearch}
							>
								<Ionicons name="close-circle" size={20} color="#999" />
							</TouchableOpacity>
						)}
					</View>

					{buscaRealizada && candidatos.length > 0 && (
						<View style={styles.candidates}>
							{candidatos.map((item: any) => {
								const ativo = Number(selecionado) === Number(item.id_frequentador);
								return (
									<TouchableOpacity
										key={String(item.id_frequentador)}
										style={[styles.candidate, ativo && styles.candidateSelected]}
										onPress={() => setSelecionado(Number(item.id_frequentador))}
									>
										<Ionicons name={ativo ? 'radio-button-on' : 'radio-button-off'} size={20} color={ativo ? COR_PRIMARIA : '#999'} />
										<View style={{ flex: 1, marginLeft: 9 }}>
											<Text style={styles.candidateName}>{item.nome}</Text>
											<Text style={styles.candidateSub}>{item.telefone || 'Sem telefone'} • {item.email || 'Sem e-mail'}</Text>
										</View>
									</TouchableOpacity>
								);
							})}
						</View>
					)}

					{buscaRealizada && !loadingBusca && candidatos.length === 0 && (
						<Text style={styles.noResult}>Nenhum frequentador encontrado.</Text>
					)}

					{selecionado > 0 && (
						<TouchableOpacity style={[styles.includeButton, saving && { opacity: 0.6 }]} onPress={incluir} disabled={saving}>
							{saving ? <ActivityIndicator color="#FFF" /> : (
								<>
									<Ionicons name="person-add-outline" size={20} color="#FFF" />
									<Text style={styles.includeText}>Incluir</Text>
								</>
							)}
						</TouchableOpacity>
					)}
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Frequentadores Inscritos ({matriculados.length})</Text>

					{loading ? (
						<ActivityIndicator size="large" color={COR_PRIMARIA} />
					) : matriculados.length === 0 ? (
						<Text style={styles.empty}>Nenhum frequentador inscrito nesta turma.</Text>
					) : (
						matriculados.map((item: any) => (
							<View key={String(item.id_fetu)} style={styles.studentCard}>
								<Text style={styles.studentName}>{item.nome}</Text>
								<Text style={styles.studentInfo}><Text style={styles.bold}>Telefone:</Text> {item.telefone || 'Não informado'}</Text>
								<Text style={styles.studentInfo}><Text style={styles.bold}>E-mail:</Text> {item.email || 'Não informado'}</Text>
								<Text style={styles.studentInfo}><Text style={styles.bold}>Data de aniversário:</Text> {item.nascimento || 'Não informada'}</Text>
							</View>
						))
					)}
				</View>

				<View style={{ height: 30 }} />
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	topHeader: { backgroundColor: COR_PRIMARIA, paddingTop: Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight || 24) + 8, paddingBottom: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
	back: { width: 48, padding: 8 },
	topTitle: { flex: 1, textAlign: 'center', color: '#FFF', fontWeight: 'bold', fontSize: 18 },
	content: { padding: 15 },
	headerCard: { backgroundColor: '#EAF0FF', borderWidth: 1, borderColor: '#CFD9F7', borderRadius: 12, padding: 15, marginBottom: 15 },
	headerCardTitle: { color: COR_PRIMARIA, fontWeight: 'bold', fontSize: 17, marginBottom: 10 },
	row: { flexDirection: 'row', marginBottom: 5 },
	key: { width: 125, fontSize: 13, color: '#5F6B7A', fontWeight: '600' },
	value: { flex: 1, fontSize: 13, color: '#273142' },
	section: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E0E4E8', marginBottom: 15 },
	sectionTitle: { color: COR_PRIMARIA, fontWeight: 'bold', fontSize: 16, marginBottom: 14 },
	searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DADDE1', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#FAFAFA' },
	searchInput: { flex: 1, minHeight: 46, paddingHorizontal: 9, color: '#222' },
	clearSearch: { padding: 4 },
	candidates: { marginTop: 10, maxHeight: 260 },
	candidate: { flexDirection: 'row', alignItems: 'center', padding: 11, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, marginBottom: 7 },
	candidateSelected: { backgroundColor: '#EEF3FF', borderColor: COR_PRIMARIA },
	candidateName: { fontSize: 14, color: '#333', fontWeight: '600' },
	candidateSub: { fontSize: 11, color: '#777', marginTop: 2 },
	includeButton: { minHeight: 50, backgroundColor: '#28A745', borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 12 },
	includeText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
	empty: { textAlign: 'center', color: '#777', paddingVertical: 20 },
	noResult: { textAlign: 'center', color: '#777', paddingVertical: 15, fontSize: 13 },
	studentCard: { borderWidth: 1, borderColor: '#E1E4E8', borderRadius: 9, padding: 13, marginBottom: 9, backgroundColor: '#FCFCFC' },
	studentName: { color: '#333', fontSize: 15, fontWeight: 'bold', marginBottom: 7 },
	studentInfo: { color: '#666', fontSize: 13, marginBottom: 3 },
	bold: { fontWeight: 'bold', color: '#555' },
});
