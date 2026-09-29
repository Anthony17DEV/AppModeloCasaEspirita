import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, ActivityIndicator, StatusBar, KeyboardAvoidingView } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from "expo-router/react-navigation";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../src/services/apiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COR_PRIMARIA = '#1B2669';

const parseJSONSeguro = (res: any) => {
	if (typeof res === 'object' && res !== null) return res;
	try {
		const txt = String(res).trim();
		const i = txt.indexOf('{'), f = txt.lastIndexOf('}');
		if (i !== -1 && f !== -1) return JSON.parse(txt.substring(i, f + 1));
	} catch (e) { }
	return null;
};

export default function EntidadesScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ origem?: string; tipo?: string }>();
	const origemFinanceiro = String(params.origem || '') === 'financeiro';
	const [codigoCasa, setCodigoCasa] = useState('');
	const [entidades, setEntidades] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [busca, setBusca] = useState('');

	const [modalVisivel, setModalVisivel] = useState(false);
	const [form, setForm] = useState({ id: 0, nome: '', tipo: 'Ambos', documento: '', telefone: '' });

	const carregarDados = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let codigo = '';
			if (session) {
				codigo = JSON.parse(session).codigo_casa || '';
				setCodigoCasa(codigo);
			}
			const res = await apiService.api.get(`api_listar_entidades.php?codigo_casa=${codigo}`);
			const data = parseJSONSeguro(res.data);
			if (data && data.success) setEntidades(data.data);
		} catch (error) {
			Alert.alert("Erro", "Falha de conexão.");
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(useCallback(() => { carregarDados(); }, []));

	const handleGravar = async () => {
		if (!form.nome || !form.tipo) {
			Alert.alert("Atenção", "O nome e o tipo são obrigatórios.");
			return;
		}
		setIsSaving(true);
		try {
			const payload = { ...form, codigo_casa: codigoCasa };
			const response = await apiService.api.post('api_salvar_entidade.php', payload);
			const data = parseJSONSeguro(response.data);
			if (data && data.success) {
				setModalVisivel(false);

				if (origemFinanceiro && Number(form.id || 0) === 0) {
					// Regra da task: cadastrou um novo beneficiário,
					// volta para a tela principal do Financeiro, sem reabrir o lançamento.
					await AsyncStorage.multiRemove([
						'@financeiro_rascunho_conta',
						'@financeiro_entidade_selecionada'
					]);
					Alert.alert("Sucesso", data.message, [
						{ text: "OK", onPress: () => router.back() }
					]);
					return;
				}

				Alert.alert("Sucesso", data.message);
				carregarDados();
			} else {
				Alert.alert("Erro", data?.message || "Falha ao gravar.");
			}
		} catch (e) {
			Alert.alert("Erro", "Falha de comunicação.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleExcluir = (id: number, nome: string) => {
		Alert.alert("Atenção", `Deseja excluir "${nome}"?`, [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Excluir", style: "destructive", onPress: async () => {
					try {
						const response = await apiService.api.get(`api_excluir_entidade.php?id=${id}`);
						const data = parseJSONSeguro(response.data);
						if (data && data.success) carregarDados();
						else Alert.alert("Erro", data?.message || "Falha.");
					} catch (e) { Alert.alert("Erro", "Falha na rede."); }
				}
			}
		]);
	};

	const abrirModal = (item?: any) => {
		if (item) setForm(item);
		else setForm({ id: 0, nome: '', tipo: 'Ambos', documento: '', telefone: '' });
		setModalVisivel(true);
	};

	const selecionarEntidade = async (item: any) => {
		if (!origemFinanceiro) {
			abrirModal(item);
			return;
		}

		await AsyncStorage.setItem(
			'@financeiro_entidade_selecionada',
			JSON.stringify({ nome: item.nome })
		);
		router.back();
	};

	const entidadesFiltradas = entidades.filter((item: any) => {
		const termo = busca.trim().toLowerCase();
		if (!termo) return true;

		return [
			item.nome,
			item.tipo,
			item.documento,
			item.telefone
		].some(valor => String(valor || '').toLowerCase().includes(termo));
	});

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />
			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color="#FFF" /></TouchableOpacity>
				<Text style={styles.headerTitle}>Pagadores e Beneficiários</Text>
				<View style={{ width: 48 }} />
			</View>

			<ScrollView style={{ padding: 15 }} keyboardShouldPersistTaps="handled">
				<View style={styles.searchBox}>
					<Feather name="search" size={20} color="#777" />
					<TextInput
						style={styles.searchInput}
						placeholder="Buscar por nome, documento ou telefone..."
						value={busca}
						onChangeText={setBusca}
						autoCorrect={false}
					/>
					{!!busca && (
						<TouchableOpacity onPress={() => setBusca('')} style={{ padding: 4 }}>
							<Feather name="x-circle" size={19} color="#999" />
						</TouchableOpacity>
					)}
				</View>

				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 40 }} />
				) : entidadesFiltradas.length === 0 ? (
					<Text style={styles.emptyText}>
						{busca ? 'Nenhum beneficiário encontrado.' : 'Nenhuma entidade cadastrada.'}
					</Text>
				) : (
					entidadesFiltradas.map(item => (
						<TouchableOpacity
							key={item.id}
							style={styles.card}
							onPress={() => selecionarEntidade(item)}
							activeOpacity={0.75}
						>
							<View style={{ flex: 1 }}>
								<Text style={styles.cardTitle}>{item.nome}</Text>
								<Text style={styles.cardSub}>Tipo: <Text style={{ fontWeight: 'bold' }}>{item.tipo}</Text></Text>
								{!!item.documento && <Text style={styles.cardSub}>Doc: {item.documento}</Text>}
								{!!item.telefone && <Text style={styles.cardSub}>Telefone: {item.telefone}</Text>}
							</View>

							<View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
								<TouchableOpacity
									onPress={(e) => {
										e.stopPropagation();
										abrirModal(item);
									}}
								>
									<Feather name="edit" size={20} color="#007bff" />
								</TouchableOpacity>

								<TouchableOpacity
									onPress={(e) => {
										e.stopPropagation();
										handleExcluir(item.id, item.nome);
									}}
								>
									<Feather name="trash-2" size={20} color="#ED1C24" />
								</TouchableOpacity>

								{origemFinanceiro && <Feather name="chevron-right" size={20} color="#888" />}
							</View>
						</TouchableOpacity>
					))
				)}

				<View style={{ height: 90 }} />
			</ScrollView>

			<TouchableOpacity style={[styles.fabBtn, { bottom: Math.max(insets.bottom, 16) + 16 }]} onPress={() => abrirModal()}>
				<Feather name="plus" size={28} color="#FFF" />
			</TouchableOpacity>

			<Modal visible={modalVisivel} transparent animationType="slide">
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
					<View style={styles.modalOverlayBottom}>
						<View style={styles.modalContentBottom}>
							<View style={styles.modalHeaderBottom}>
								<Text style={styles.headerTitleModal}>{form.id ? 'Editar Entidade' : 'Nova Entidade'}</Text>
								<TouchableOpacity onPress={() => setModalVisivel(false)}><Feather name="x" size={26} color="#555" /></TouchableOpacity>
							</View>
							<ScrollView contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 20 }}>
								<Text style={styles.label}>Nome Completo / Razão Social</Text>
								<TextInput style={styles.input} value={form.nome} onChangeText={t => setForm({ ...form, nome: t })} />

								<Text style={styles.label}>Tipo</Text>
								<View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
									{['Ambos', 'Pagador', 'Beneficiário'].map(t => (
										<TouchableOpacity key={t} style={[styles.typeBtn, form.tipo === t && styles.typeBtnActive]} onPress={() => setForm({ ...form, tipo: t })}>
											<Text style={[styles.typeText, form.tipo === t && styles.typeTextActive]}>{t}</Text>
										</TouchableOpacity>
									))}
								</View>

								<Text style={styles.label}>CPF ou CNPJ (Opcional)</Text>
								<TextInput style={styles.input} keyboardType="numeric" value={form.documento} onChangeText={t => setForm({ ...form, documento: t })} />

								<Text style={styles.label}>Telefone (Opcional)</Text>
								<MaskedTextInput mask="(99) 99999-9999" keyboardType="numeric" style={styles.input} value={form.telefone} onChangeText={(_, raw) => setForm({ ...form, telefone: raw })} />

								<TouchableOpacity style={styles.btnSalvarFull} onPress={handleGravar} disabled={isSaving}>
									{isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSalvarFullText}>Salvar</Text>}
								</TouchableOpacity>
							</ScrollView>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f4f6f8' },
	headerBar: { height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20), paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight, backgroundColor: COR_PRIMARIA, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, elevation: 5 },
	backBtn: { padding: 10 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
	searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DADDE1', borderRadius: 10, paddingHorizontal: 12, minHeight: 48, marginBottom: 15 },
	searchInput: { flex: 1, minHeight: 46, paddingHorizontal: 10, color: '#222', fontSize: 14 },
	emptyText: { textAlign: 'center', marginTop: 25, color: '#666' },
	card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#eee' },
	cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 5 },
	cardSub: { fontSize: 13, color: '#666' },
	fabBtn: { position: 'absolute', bottom: 30, right: 20, backgroundColor: COR_PRIMARIA, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
	modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContentBottom: { backgroundColor: '#f4f6f8', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
	modalHeaderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' },
	headerTitleModal: { fontSize: 18, fontWeight: 'bold' },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
	input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#000', marginBottom: 15 },
	typeBtn: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
	typeBtnActive: { backgroundColor: COR_PRIMARIA, borderColor: COR_PRIMARIA },
	typeText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
	typeTextActive: { color: '#FFF' },
	btnSalvarFull: { backgroundColor: '#28a745', height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginTop: 10 },
	btnSalvarFullText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});