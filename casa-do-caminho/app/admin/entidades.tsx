import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, ActivityIndicator, StatusBar, KeyboardAvoidingView } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../src/services/apiService';

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
	const [codigoCasa, setCodigoCasa] = useState('');
	const [entidades, setEntidades] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

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
				Alert.alert("Sucesso", data.message);
				setModalVisivel(false);
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

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />
			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color="#FFF" /></TouchableOpacity>
				<Text style={styles.headerTitle}>Pagadores e Beneficiários</Text>
				<View style={{ width: 48 }} />
			</View>

			<ScrollView style={{ padding: 15 }}>
				{isLoading ? <ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 40 }} /> :
					entidades.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>Nenhuma entidade cadastrada.</Text> :
						entidades.map(item => (
							<View key={item.id} style={styles.card}>
								<View style={{ flex: 1 }}>
									<Text style={styles.cardTitle}>{item.nome}</Text>
									<Text style={styles.cardSub}>Tipo: <Text style={{ fontWeight: 'bold' }}>{item.tipo}</Text></Text>
									{!!item.documento && <Text style={styles.cardSub}>Doc: {item.documento}</Text>}
									{!!item.telefone && <Text style={styles.cardSub}>Telefone: {item.telefone}</Text>}
								</View>
								<View style={{ flexDirection: 'row', gap: 10 }}>
									<TouchableOpacity onPress={() => abrirModal(item)}><Feather name="edit" size={20} color="#007bff" /></TouchableOpacity>
									<TouchableOpacity onPress={() => handleExcluir(item.id, item.nome)}><Feather name="trash-2" size={20} color="#ED1C24" /></TouchableOpacity>
								</View>
							</View>
						))
				}
			</ScrollView>

			<TouchableOpacity style={styles.fabBtn} onPress={() => abrirModal()}>
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
							<ScrollView contentContainerStyle={{ padding: 20 }}>
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