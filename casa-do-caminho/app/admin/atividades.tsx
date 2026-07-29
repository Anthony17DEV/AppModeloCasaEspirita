import React, { useState } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F4F6F8';

export default function AdminAtividadesScreen() {
	const [modalVisivel, setModalVisivel] = useState(false);
	const [modoEdicao, setModoEdicao] = useState(false);
	const [atividadeEditandoId, setAtividadeEditandoId] = useState<number | null>(null);

	const [formTitulo, setFormTitulo] = useState('');
	const [formTipo, setFormTipo] = useState('Palestra');
	const [formData, setFormData] = useState('');
	const [formHora, setFormHora] = useState('');
	const [formResponsavel, setFormResponsavel] = useState('');
	const [formLocal, setFormLocal] = useState('');

	const [atividades, setAtividades] = useState([
		{ id: 1, titulo: 'O Evangelho Segundo o Espiritismo', tipo: 'Palestra', data: '25/08/2026', hora: '19:30 às 21:00', responsavel: 'Ir. Carlos Eduardo', local: 'Salão Principal' },
		{ id: 2, titulo: 'Atendimento Fraterno (Passe)', tipo: 'Passe', data: '25/08/2026', hora: '20:00 às 21:30', responsavel: 'Equipe de Passistas', local: 'Salas 1 a 4' },
	]);

	const abrirModalCriar = () => {
		setModoEdicao(false);
		setFormTitulo(''); setFormTipo('Palestra'); setFormData(''); setFormHora(''); setFormResponsavel(''); setFormLocal('');
		setModalVisivel(true);
	};

	const abrirModalEditar = (ativ: any) => {
		setModoEdicao(true);
		setAtividadeEditandoId(ativ.id);
		setFormTitulo(ativ.titulo); setFormTipo(ativ.tipo); setFormData(ativ.data); setFormHora(ativ.hora); setFormResponsavel(ativ.responsavel); setFormLocal(ativ.local);
		setModalVisivel(true);
	};

	const handleSalvar = () => {
		if (!formTitulo || !formData || !formHora) {
			Alert.alert("Erro", "Preencha pelo menos o título, data e horário.");
			return;
		}

		if (modoEdicao && atividadeEditandoId) {
			setAtividades(prev => prev.map(a =>
				a.id === atividadeEditandoId ? { ...a, titulo: formTitulo, tipo: formTipo, data: formData, hora: formHora, responsavel: formResponsavel, local: formLocal } : a
			));
			Alert.alert("Sucesso", "Atividade atualizada!");
		} else {
			const novoId = Math.floor(Math.random() * 10000);
			setAtividades([{ id: novoId, titulo: formTitulo, tipo: formTipo, data: formData, hora: formHora, responsavel: formResponsavel, local: formLocal }, ...atividades]);
			Alert.alert("Sucesso", "Nova atividade agendada!");
		}
		setModalVisivel(false);
	};

	const handleExcluir = (id: number, titulo: string) => {
		Alert.alert("Excluir Atividade", `Tem certeza que deseja cancelar "${titulo}"?`, [
			{ text: "Não", style: "cancel" },
			{
				text: "Sim, Cancelar", style: "destructive", onPress: () => {
					setAtividades(prev => prev.filter(a => a.id !== id));
				}
			}
		]);
	};

	const getCorTag = (tipo: string) => {
		if (tipo === 'Palestra') return { bg: '#E3F2FD', text: '#1976D2' };
		if (tipo === 'Passe') return { bg: '#E8F5E9', text: '#2E7D32' };
		return { bg: '#FFF3E0', text: '#E65100' };
	};

	return (
		<View style={styles.container}>
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Gestão de Atividades</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={styles.pageSubtitle}>Agenda da Semana</Text>

				{atividades.map(ativ => {
					const cores = getCorTag(ativ.tipo);
					return (
						<View key={ativ.id} style={styles.card}>
							<View style={styles.cardHeader}>
								<View style={[styles.tag, { backgroundColor: cores.bg }]}>
									<Text style={[styles.tagText, { color: cores.text }]}>{ativ.tipo}</Text>
								</View>
								<View style={styles.actionsRow}>
									<TouchableOpacity onPress={() => abrirModalEditar(ativ)} style={{ marginRight: 15 }}>
										<Ionicons name="create-outline" size={22} color={COR_PRIMARIA} />
									</TouchableOpacity>
									<TouchableOpacity onPress={() => handleExcluir(ativ.id, ativ.titulo)}>
										<Ionicons name="trash-outline" size={22} color="#D32F2F" />
									</TouchableOpacity>
								</View>
							</View>

							<Text style={styles.activityTitle}>{ativ.titulo}</Text>

							<View style={styles.infoGrid}>
								<View style={styles.infoItem}>
									<Ionicons name="calendar" size={16} color="#7F8C8D" />
									<Text style={styles.infoText}>{ativ.data}</Text>
								</View>
								<View style={styles.infoItem}>
									<Ionicons name="time" size={16} color="#7F8C8D" />
									<Text style={styles.infoText}>{ativ.hora}</Text>
								</View>
								<View style={styles.infoItem}>
									<Ionicons name="person" size={16} color="#7F8C8D" />
									<Text style={styles.infoText} numberOfLines={1}>{ativ.responsavel}</Text>
								</View>
								<View style={styles.infoItem}>
									<Ionicons name="location" size={16} color="#7F8C8D" />
									<Text style={styles.infoText} numberOfLines={1}>{ativ.local}</Text>
								</View>
							</View>
						</View>
					);
				})}
				<View style={{ height: 100 }} />
			</ScrollView>

			<TouchableOpacity style={styles.fab} onPress={abrirModalCriar} activeOpacity={0.8}>
				<Ionicons name="add" size={32} color={COR_PRIMARIA} />
			</TouchableOpacity>

			<Modal visible={modalVisivel} animationType="slide" transparent={true} onRequestClose={() => setModalVisivel(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>{modoEdicao ? 'Editar Atividade' : 'Nova Atividade'}</Text>
							<TouchableOpacity onPress={() => setModalVisivel(false)}>
								<Ionicons name="close" size={28} color="#333" />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Título da Atividade</Text>
								<TextInput style={styles.modalInput} value={formTitulo} onChangeText={setFormTitulo} placeholder="Ex: Palestra Pública" />
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Tipo</Text>
								<View style={styles.typeSelector}>
									{['Palestra', 'Passe', 'Estudo'].map(tipo => (
										<TouchableOpacity
											key={tipo}
											style={[styles.typeOption, formTipo === tipo && styles.typeOptionActive]}
											onPress={() => setFormTipo(tipo)}
										>
											<Text style={[styles.typeOptionText, formTipo === tipo && styles.typeOptionTextActive]}>{tipo}</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>

							<View style={styles.row}>
								<View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
									<Text style={styles.inputLabel}>Data</Text>
									<TextInput style={styles.modalInput} value={formData} onChangeText={setFormData} placeholder="DD/MM/AAAA" keyboardType="numeric" />
								</View>
								<View style={[styles.inputGroup, { flex: 1 }]}>
									<Text style={styles.inputLabel}>Horário</Text>
									<TextInput style={styles.modalInput} value={formHora} onChangeText={setFormHora} placeholder="19:30 às 21:00" />
								</View>
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Expositor / Responsável</Text>
								<TextInput style={styles.modalInput} value={formResponsavel} onChangeText={setFormResponsavel} placeholder="Nome do responsável" />
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Local</Text>
								<TextInput style={styles.modalInput} value={formLocal} onChangeText={setFormLocal} placeholder="Ex: Salão Principal" />
							</View>

							<TouchableOpacity style={styles.modalSaveBtn} onPress={handleSalvar}>
								<Text style={styles.modalSaveBtnText}>{modoEdicao ? 'Atualizar Agenda' : 'Agendar Atividade'}</Text>
							</TouchableOpacity>
							<View style={{ height: 20 }} />
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	headerBar: {
		backgroundColor: COR_PRIMARIA, paddingTop: Platform.OS === 'ios' ? 55 : 45,
		paddingBottom: 20, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 8, zIndex: 10,
	},
	backButton: { padding: 5 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

	content: { flex: 1, padding: 20 },
	pageSubtitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 15 },

	card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
	cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
	tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
	tagText: { fontSize: 11, fontWeight: 'bold' },
	actionsRow: { flexDirection: 'row', alignItems: 'center' },
	activityTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 15 },

	infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
	infoItem: { flexDirection: 'row', alignItems: 'center', width: '47%', marginBottom: 5 },
	infoText: { fontSize: 13, color: '#546E7A', marginLeft: 6, flex: 1 },

	fab: {
		position: 'absolute', bottom: 25, right: 25,
		backgroundColor: COR_DETALHE, width: 60, height: 60, borderRadius: 30,
		justifyContent: 'center', alignItems: 'center', elevation: 10,
	},

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	modalTitle: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA },

	row: { flexDirection: 'row' },
	inputGroup: { marginBottom: 16 },
	inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
	modalInput: { backgroundColor: '#F4F6F8', height: 50, borderRadius: 12, paddingHorizontal: 15, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' },

	typeSelector: { flexDirection: 'row', gap: 10 },
	typeOption: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: 'transparent' },
	typeOptionActive: { backgroundColor: '#EBF4FC', borderColor: COR_PRIMARIA },
	typeOptionText: { fontSize: 13, fontWeight: '600', color: '#7F8C8D' },
	typeOptionTextActive: { color: COR_PRIMARIA, fontWeight: 'bold' },

	modalSaveBtn: { backgroundColor: COR_PRIMARIA, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
	modalSaveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});