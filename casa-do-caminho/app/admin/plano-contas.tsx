import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiService } from '../../src/services/apiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COR_PRIMARIA = '#1B2669';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;

	try {
		const texto = String(resposta || '').trim();
		const inicio = texto.indexOf('{');
		const fim = texto.lastIndexOf('}');

		if (inicio !== -1 && fim !== -1) {
			return JSON.parse(texto.substring(inicio, fim + 1));
		}
	} catch (e) { }

	return null;
};

export default function PlanoContasScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ origem?: string; tipo?: string }>();
	const origemFinanceiro = String(params.origem || '') === 'financeiro';
	const tipoOrigem = String(params.tipo || '');

	const [planos, setPlanos] = useState<any[]>([]);
	const [busca, setBusca] = useState('');
	const [tipoFiltro, setTipoFiltro] = useState(tipoOrigem || 'Todos');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [modalNovo, setModalNovo] = useState(false);
	const [form, setForm] = useState({
		descricao: '',
		tipo: tipoOrigem || 'Despesa'
	});

	const carregar = async () => {
		setLoading(true);

		try {
			const response = await apiService.api.get('api_listar_plano_contas.php');
			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				setPlanos(Array.isArray(dados.data) ? dados.data : []);
			} else {
				Alert.alert('Erro', dados?.message || 'Não foi possível carregar os planos de contas.');
			}
		} catch (e) {
			Alert.alert('Erro', 'Falha de comunicação.');
		} finally {
			setLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregar();
		}, [])
	);

	const planosFiltrados = useMemo(() => {
		const termo = busca.trim().toLowerCase();

		return planos.filter((item: any) => {
			const tipo = String(item.tipo || '');
			const label = String(item.label || item.descricao || '');

			const bateTipo = tipoFiltro === 'Todos' || tipo === tipoFiltro;
			const bateBusca = !termo || label.toLowerCase().includes(termo);

			return bateTipo && bateBusca;
		});
	}, [planos, busca, tipoFiltro]);

	const selecionar = async (item: any) => {
		if (!origemFinanceiro) return;

		const tipo = String(item.tipo || '');
		if (tipoOrigem && tipo && tipo !== tipoOrigem) {
			Alert.alert('Atenção', `Selecione um plano do tipo ${tipoOrigem}.`);
			return;
		}

		await AsyncStorage.setItem(
			'@financeiro_plano_selecionado',
			JSON.stringify({
				label: item.label || item.descricao || '',
				value: item.value || item.id || 0,
				tipo
			})
		);

		router.back();
	};

	const salvar = async () => {
		if (!form.descricao.trim()) {
			Alert.alert('Atenção', 'Informe a descrição do plano.');
			return;
		}

		setSaving(true);

		try {
			const response = await apiService.api.post('api_salvar_plano_conta.php', form);
			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				setModalNovo(false);
				setForm({
					descricao: '',
					tipo: tipoOrigem || (tipoFiltro === 'Todos' ? 'Despesa' : tipoFiltro)
				});
				await carregar();
				Alert.alert('Sucesso', dados.message || 'Plano cadastrado.');
			} else {
				Alert.alert('Erro', dados?.message || 'Não foi possível salvar o plano.');
			}
		} catch (e) {
			Alert.alert('Erro', 'Falha de comunicação.');
		} finally {
			setSaving(false);
		}
	};

	const excluir = (item: any) => {
		const id = Number(item.value || item.id || 0);
		const nome = String(item.label || item.descricao || '');

		if (!id) {
			Alert.alert('Erro', 'Não foi possível identificar o plano.');
			return;
		}

		Alert.alert(
			'Excluir plano',
			`Deseja excluir "${nome}"?`,
			[
				{ text: 'Cancelar', style: 'cancel' },
				{
					text: 'Excluir',
					style: 'destructive',
					onPress: async () => {
						try {
							const response = await apiService.api.get(`api_excluir_plano_conta.php?id=${id}`);
							const dados = parseJSONSeguro(response.data);

							if (dados?.success) {
								carregar();
							} else {
								Alert.alert('Erro', dados?.message || 'Não foi possível excluir.');
							}
						} catch (e) {
							Alert.alert('Erro', 'Falha de comunicação.');
						}
					}
				}
			]
		);
	};

	const abrirNovo = () => {
		const tipoInicial = tipoOrigem || (tipoFiltro !== 'Todos' ? tipoFiltro : 'Despesa');
		setForm({ descricao: '', tipo: tipoInicial });
		setModalNovo(true);
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.header}>
				<TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={27} color="#FFF" />
				</TouchableOpacity>

				<Text style={styles.headerTitle}>Plano de Contas</Text>

				<View style={styles.headerButton} />
			</View>

			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				<View style={styles.searchBox}>
					<Feather name="search" size={20} color="#777" />
					<TextInput
						style={styles.searchInput}
						value={busca}
						onChangeText={setBusca}
						placeholder="Buscar plano de contas..."
						autoCorrect={false}
					/>
					{!!busca && (
						<TouchableOpacity onPress={() => setBusca('')}>
							<Feather name="x-circle" size={19} color="#999" />
						</TouchableOpacity>
					)}
				</View>

				{!tipoOrigem && (
					<View style={styles.tabs}>
						{['Todos', 'Receita', 'Despesa'].map(tipo => (
							<TouchableOpacity
								key={tipo}
								style={[styles.tab, tipoFiltro === tipo && styles.tabAtiva]}
								onPress={() => setTipoFiltro(tipo)}
							>
								<Text style={[styles.tabText, tipoFiltro === tipo && styles.tabTextAtivo]}>
									{tipo}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				)}

				{tipoOrigem ? (
					<Text style={styles.contextText}>
						Selecionando plano para: <Text style={{ fontWeight: 'bold' }}>{tipoOrigem}</Text>
					</Text>
				) : null}

				{loading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 35 }} />
				) : planosFiltrados.length === 0 ? (
					<Text style={styles.emptyText}>Nenhum plano de contas encontrado.</Text>
				) : (
					planosFiltrados.map((item: any) => (
						<TouchableOpacity
							key={String(item.value || item.id || item.label)}
							style={styles.card}
							activeOpacity={origemFinanceiro ? 0.75 : 1}
							onPress={() => selecionar(item)}
						>
							<View style={{ flex: 1 }}>
								<Text style={styles.cardTitle}>{item.label || item.descricao}</Text>
								<Text style={styles.cardSub}>{item.tipo || 'Sem tipo'}</Text>
							</View>

							<View style={styles.cardActions}>
								<TouchableOpacity
									style={styles.iconBtn}
									onPress={(e) => {
										e.stopPropagation();
										excluir(item);
									}}
								>
									<Feather name="trash-2" size={20} color="#ED1C24" />
								</TouchableOpacity>

								{origemFinanceiro && (
									<Feather name="chevron-right" size={21} color="#888" />
								)}
							</View>
						</TouchableOpacity>
					))
				)}

				<View style={{ height: 90 }} />
			</ScrollView>

			<TouchableOpacity style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]} onPress={abrirNovo}>
				<Feather name="plus" size={28} color="#FFF" />
			</TouchableOpacity>

			<Modal visible={modalNovo} transparent animationType="slide">
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				>
					<View style={styles.overlay}>
						<View style={styles.modal}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>Novo Plano de Conta</Text>
								<TouchableOpacity onPress={() => setModalNovo(false)}>
									<Feather name="x" size={25} color="#555" />
								</TouchableOpacity>
							</View>

							<View style={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 20 }}>
								<Text style={styles.label}>Tipo</Text>

								<View style={styles.typeRow}>
									{['Receita', 'Despesa'].map(tipo => (
										<TouchableOpacity
											key={tipo}
											disabled={!!tipoOrigem}
											style={[
												styles.typeBtn,
												form.tipo === tipo && styles.typeBtnAtivo,
												!!tipoOrigem && form.tipo !== tipo && { opacity: 0.4 }
											]}
											onPress={() => setForm({ ...form, tipo })}
										>
											<Text style={[
												styles.typeBtnText,
												form.tipo === tipo && styles.typeBtnTextAtivo
											]}>
												{tipo}
											</Text>
										</TouchableOpacity>
									))}
								</View>

								<Text style={styles.label}>Descrição</Text>
								<TextInput
									style={styles.input}
									value={form.descricao}
									onChangeText={descricao => setForm({ ...form, descricao })}
									placeholder="Ex: Internet, Manutenção..."
									autoFocus
								/>

								<TouchableOpacity
									style={[styles.saveBtn, saving && { opacity: 0.6 }]}
									onPress={salvar}
									disabled={saving}
								>
									{saving
										? <ActivityIndicator color="#FFF" />
										: <Text style={styles.saveText}>Salvar</Text>
									}
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F4F6F8' },
	header: {
		height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20),
		paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
		backgroundColor: COR_PRIMARIA,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		elevation: 5
	},
	headerButton: { width: 48, padding: 10 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
	content: { padding: 15 },
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#DADDE1',
		borderRadius: 10,
		paddingHorizontal: 12,
		minHeight: 48,
		marginBottom: 12
	},
	searchInput: { flex: 1, minHeight: 46, paddingHorizontal: 10, color: '#222' },
	tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
	tab: {
		flex: 1,
		paddingVertical: 10,
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#DDD'
	},
	tabAtiva: { backgroundColor: COR_PRIMARIA, borderColor: COR_PRIMARIA },
	tabText: { color: '#555', fontSize: 12, fontWeight: '600' },
	tabTextAtivo: { color: '#FFF' },
	contextText: { color: '#666', marginBottom: 12, fontSize: 13 },
	card: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#EEE',
		borderRadius: 10,
		padding: 15,
		marginBottom: 10,
		flexDirection: 'row',
		alignItems: 'center',
		elevation: 1
	},
	cardTitle: { color: '#333', fontSize: 15, fontWeight: 'bold' },
	cardSub: { color: '#777', fontSize: 12, marginTop: 4 },
	cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	iconBtn: { padding: 8 },
	emptyText: { textAlign: 'center', color: '#777', marginTop: 30 },
	fab: {
		position: 'absolute',
		right: 20,
		bottom: 30,
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: COR_PRIMARIA,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 5
	},
	overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modal: {
		backgroundColor: '#F4F6F8',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20
	},
	modalHeader: {
		backgroundColor: '#FFF',
		padding: 20,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#DDD',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 6 },
	input: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#DDD',
		borderRadius: 8,
		paddingHorizontal: 15,
		minHeight: 48,
		marginBottom: 18,
		color: '#222'
	},
	typeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
	typeBtn: {
		flex: 1,
		height: 44,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#DDD'
	},
	typeBtnAtivo: { backgroundColor: COR_PRIMARIA, borderColor: COR_PRIMARIA },
	typeBtnText: { color: '#555', fontWeight: '600' },
	typeBtnTextAtivo: { color: '#FFF' },
	saveBtn: {
		backgroundColor: '#28A745',
		height: 54,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	saveText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
