import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useNavigation } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import MenuLateral from '@/components/MenuLateral';
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


export default function TurmasAdminScreen() {
	const navigation = useNavigation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [usuario, setUsuario] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [turmas, setTurmas] = useState<any[]>([]);
	const [atividades, setAtividades] = useState<any[]>([]);

	const [filtro, setFiltro] = useState({
		idAtividade: 0,
		periodo: '',
		status: '',
	});

	const [modalAtivo, setModalAtivo] = useState<'atividade' | 'status' | null>(null);

	const opcoesStatus = [
		{ label: 'Todos', value: '' },
		{ label: 'Cursando', value: 'CURSANDO' },
		{ label: 'Finalizado', value: 'FINALIZADO' },
	];


	const carregarTurmas = async (userParam?: any) => {
		const user = userParam || usuario;
		if (!user) return;

		setLoading(true);
		try {
			const idUsuario = obterIdUsuario(user);
			const idFrequentador = obterIdFrequentador(user);
			const qs =
				`id_usuario=${idUsuario}` +
				`&id_frequentador=${idFrequentador}` +
				`&id_atividade=${filtro.idAtividade || 0}` +
				`&periodo=${encodeURIComponent(filtro.periodo.trim())}` +
				`&status=${encodeURIComponent(filtro.status)}`;

			const response = await apiService.api.get(`api_listar_turmas_admin.php?${qs}`);
			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				setTurmas(Array.isArray(dados.data) ? dados.data : []);
				setAtividades(Array.isArray(dados.atividades) ? dados.atividades : []);
			} else {
				setTurmas([]);
				Alert.alert('Atenção', dados?.message || 'Não foi possível consultar as turmas.');
			}
		} catch (error) {
			Alert.alert('Erro', 'Falha na comunicação com o servidor.');
		} finally {
			setLoading(false);
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

		await carregarTurmas(user);
	};

	useFocusEffect(
		useCallback(() => {
			navigation.setOptions({ headerShown: false });
			carregarTela();
		}, [navigation])
	);

	const atividadeSelecionada = useMemo(
		() => atividades.find((a: any) => Number(a.id) === Number(filtro.idAtividade)),
		[atividades, filtro.idAtividade]
	);

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

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.header}>
				<TouchableOpacity style={styles.headerButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Administração das Turmas</Text>
				<View style={styles.headerButton} />
			</View>

			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				<View style={styles.filterCard}>
					<Text style={styles.sectionTitle}>Filtros de Busca</Text>

					<Text style={styles.label}>Atividade</Text>
					<TouchableOpacity style={styles.selector} onPress={() => setModalAtivo('atividade')}>
						<Text style={[styles.selectorText, !filtro.idAtividade && styles.placeholder]}>
							{atividadeSelecionada?.nome || 'Todas as atividades'}
						</Text>
						<Ionicons name="chevron-down" size={20} color="#555" />
					</TouchableOpacity>

					<Text style={styles.label}>Período</Text>
					<TextInput
						style={styles.input}
						value={filtro.periodo}
						onChangeText={periodo => setFiltro({ ...filtro, periodo })}
						placeholder="Ex.: 2026.2"
					/>

					<Text style={styles.label}>Status</Text>
					<TouchableOpacity style={styles.selector} onPress={() => setModalAtivo('status')}>
						<Text style={[styles.selectorText, !filtro.status && styles.placeholder]}>
							{opcoesStatus.find(o => o.value === filtro.status)?.label || 'Todos'}
						</Text>
						<Ionicons name="chevron-down" size={20} color="#555" />
					</TouchableOpacity>

					<TouchableOpacity style={styles.searchButton} onPress={() => carregarTurmas()}>
						<Ionicons name="search-outline" size={19} color="#FFF" />
						<Text style={styles.searchText}>Buscar</Text>
					</TouchableOpacity>
				</View>

				{loading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} />
				) : turmas.length === 0 ? (
					<Text style={styles.empty}>Nenhuma turma encontrada.</Text>
				) : (
					turmas.map((item: any) => (
						<View key={String(item.id_turma)} style={styles.card}>
							<Text style={styles.cardTitle}>Turma #{item.id_turma}</Text>

							<View style={styles.infoRow}><Text style={styles.infoLabel}>Atividade:</Text><Text style={styles.infoValue}>{item.atividade}</Text></View>
							<View style={styles.infoRow}><Text style={styles.infoLabel}>Período:</Text><Text style={styles.infoValue}>{item.periodo || '-'}</Text></View>
							<View style={styles.infoRow}><Text style={styles.infoLabel}>Coordenador:</Text><Text style={styles.infoValue}>{item.coordenador || '-'}</Text></View>
							<View style={styles.infoRow}><Text style={styles.infoLabel}>Sub-coordenador:</Text><Text style={styles.infoValue}>{item.subcoordenador || '-'}</Text></View>
							<View style={styles.infoRow}><Text style={styles.infoLabel}>Dia da semana:</Text><Text style={styles.infoValue}>{item.dia_semana || '-'}</Text></View>
							<View style={styles.infoRow}><Text style={styles.infoLabel}>Hora inicial:</Text><Text style={styles.infoValue}>{item.hora_inicial || '-'}</Text></View>
							<View style={styles.infoRow}><Text style={styles.infoLabel}>Hora final:</Text><Text style={styles.infoValue}>{item.hora_final || '-'}</Text></View>
							<View style={styles.infoRow}>
								<Text style={styles.infoLabel}>Status:</Text>
								<Text style={[styles.status, { color: String(item.status).toUpperCase() === 'CURSANDO' ? '#2E7D32' : '#6B7280' }]}>
									{item.status}
								</Text>
							</View>

							<View style={styles.actions}>
								<TouchableOpacity style={styles.action} onPress={() => abrirMatriculas(item)}>
									<Ionicons name="person-add-outline" size={25} color="#0D6EFD" />
									<Text style={[styles.actionText, { color: '#0D6EFD' }]}>Matrícula</Text>
								</TouchableOpacity>

								<View style={styles.dividerVertical} />

								<TouchableOpacity style={styles.action} onPress={() => abrirFrequencia(item)}>
									<Ionicons name="checkbox-outline" size={25} color="#198754" />
									<Text style={[styles.actionText, { color: '#198754' }]}>Frequência</Text>
								</TouchableOpacity>
							</View>
						</View>
					))
				)}

				<View style={{ height: 30 }} />
			</ScrollView>

			<Modal visible={!!modalAtivo} transparent animationType="fade" onRequestClose={() => setModalAtivo(null)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>{modalAtivo === 'atividade' ? 'Atividade' : 'Status'}</Text>
							<TouchableOpacity onPress={() => setModalAtivo(null)}>
								<Ionicons name="close" size={24} color="#555" />
							</TouchableOpacity>
						</View>

						<FlatList
							data={
								modalAtivo === 'atividade'
									? [{ id: 0, nome: 'Todas as atividades' }, ...atividades]
									: opcoesStatus
							}
							keyExtractor={(item: any, index) => String(item.id ?? item.value ?? index)}
							renderItem={({ item }: any) => (
								<TouchableOpacity
									style={styles.modalItem}
									onPress={() => {
										if (modalAtivo === 'atividade') {
											setFiltro({ ...filtro, idAtividade: Number(item.id || 0) });
										} else {
											setFiltro({ ...filtro, status: String(item.value || '') });
										}
										setModalAtivo(null);
									}}
								>
									<Text style={styles.modalItemText}>{modalAtivo === 'atividade' ? item.nome : item.label}</Text>
								</TouchableOpacity>
							)}
						/>
					</View>
				</View>
			</Modal>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
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
	headerButton: { width: 48, padding: 8 },
	headerTitle: { flex: 1, color: '#FFF', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
	content: { padding: 15 },
	filterCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#E0E4E8', marginBottom: 15 },
	sectionTitle: { color: COR_PRIMARIA, fontWeight: 'bold', fontSize: 16, marginBottom: 15 },
	label: { fontSize: 13, color: '#555', fontWeight: 'bold', marginBottom: 6 },
	input: { minHeight: 48, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#DADDE1', borderRadius: 8, paddingHorizontal: 13, marginBottom: 14, color: '#222' },
	selector: { minHeight: 48, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#DADDE1', borderRadius: 8, paddingHorizontal: 13, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
	selectorText: { flex: 1, color: '#222', fontSize: 14 },
	placeholder: { color: '#999' },
	searchButton: { height: 48, backgroundColor: '#0D6EFD', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
	searchText: { color: '#FFF', fontWeight: 'bold' },
	empty: { textAlign: 'center', color: '#777', marginTop: 35 },
	card: { backgroundColor: '#FFF', borderRadius: 10, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#DEE2E6' },
	cardTitle: { color: COR_PRIMARIA, fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
	infoRow: { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
	infoLabel: { width: 125, color: '#666', fontSize: 13, fontWeight: '600' },
	infoValue: { flex: 1, color: '#333', fontSize: 13 },
	status: { flex: 1, fontWeight: 'bold', fontSize: 13 },
	actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEE', marginTop: 12 },
	action: { flex: 1, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
	actionText: { fontWeight: 'bold', fontSize: 13 },
	dividerVertical: { width: 1, backgroundColor: '#EEE', marginVertical: 8 },
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
	modalContent: { backgroundColor: '#FFF', borderRadius: 15, padding: 16, maxHeight: '78%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 12, marginBottom: 5 },
	modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
	modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
	modalItemText: { color: '#333', fontSize: 14 },
});
