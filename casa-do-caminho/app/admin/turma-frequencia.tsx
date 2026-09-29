import React, { useCallback, useState } from 'react';
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
import { MaskedTextInput } from 'react-native-mask-text';
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


const dataHoje = () => {
	const d = new Date();
	return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function TurmaFrequenciaScreen() {
	const navigation = useNavigation();
	const params = useLocalSearchParams<any>();
	const idTurma = Number(valorParam(params.idTurma ?? params.id_turma ?? params.turma_id ?? params.id) || 0);

	const [usuario, setUsuario] = useState<any>(null);
	const [turma, setTurma] = useState<any>(null);
	const [alunos, setAlunos] = useState<any[]>([]);
	const [assunto, setAssunto] = useState('');
	const [data, setData] = useState(dataHoje());
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const carregar = async (userParam?: any, dataParam?: string) => {
		const user = userParam || usuario;
		if (!user || !idTurma) return;

		setLoading(true);
		try {
			const idUsuario = obterIdUsuario(user);
			const idFrequentador = obterIdFrequentador(user);
			const dataConsulta = dataParam !== undefined ? dataParam : data;

			const response = await apiService.api.get(
				`api_carregar_frequencia_turma.php?id_usuario=${idUsuario}&id_frequentador=${idFrequentador}&id_turma=${idTurma}&data=${encodeURIComponent(dataConsulta)}`
			);
			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				setTurma(dados.turma || null);
				setAlunos(Array.isArray(dados.alunos) ? dados.alunos : []);
				setAssunto(dados.assunto || '');
			} else {
				Alert.alert('Atenção', dados?.message || 'Não foi possível carregar a frequência.');
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
		await carregar(user, dataHoje());
	};

	useFocusEffect(
		useCallback(() => {
			navigation.setOptions({ headerShown: false });
			iniciar();
		}, [navigation, idTurma])
	);

	const alternar = (idFetu: number) => {
		setAlunos(prev => prev.map(item =>
			Number(item.id_fetu) === Number(idFetu)
				? { ...item, presente: !item.presente }
				: item
		));
	};

	const salvar = async () => {
		if (data.replace(/\D/g, '').length !== 8) {
			Alert.alert('Atenção', 'Informe uma data válida.');
			return;
		}
		if (!assunto.trim()) {
			Alert.alert('Atenção', 'Informe o assunto tratado no dia.');
			return;
		}
		if (alunos.length === 0) {
			Alert.alert('Atenção', 'Não existem alunos matriculados nesta turma.');
			return;
		}

		setSaving(true);
		try {
			const response = await apiService.api.post('api_salvar_frequencia_turma.php', {
				id_usuario: obterIdUsuario(usuario),
				id_frequentador_sessao: obterIdFrequentador(usuario),
				id_turma: idTurma,
				data,
				assunto: assunto.trim(),
				frequencias: alunos.map(item => ({
					id_fetu: Number(item.id_fetu),
					presente: !!item.presente,
				})),
			});

			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				Alert.alert('Sucesso', dados.message || 'Frequência gravada.');
				await carregar();
			} else {
				Alert.alert('Erro', dados?.message || 'Não foi possível gravar a frequência.');
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
				<Text style={styles.topTitle}>Frequência da Turma</Text>
				<View style={styles.back} />
			</View>

			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				<HeaderTurma />

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Dados da Aula</Text>

					<Text style={styles.label}>Assunto tratado no dia *</Text>
					<TextInput
						style={[styles.input, { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }]}
						value={assunto}
						onChangeText={setAssunto}
						placeholder="Descreva o assunto tratado..."
						multiline
					/>

					<Text style={styles.label}>Data *</Text>
					<View style={styles.dateRow}>
						<MaskedTextInput
							mask="99/99/9999"
							style={[styles.input, { flex: 1, marginBottom: 0 }]}
							keyboardType="numeric"
							value={data}
							onChangeText={setData}
							placeholder="DD/MM/AAAA"
						/>
						<TouchableOpacity style={styles.loadDateButton} onPress={() => carregar(undefined, data)}>
							<Ionicons name="refresh-outline" size={21} color="#FFF" />
						</TouchableOpacity>
					</View>
					<Text style={styles.hint}>Use o botão ao lado para carregar uma frequência já lançada nesta data.</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Alunos ({alunos.length})</Text>

					{loading ? (
						<ActivityIndicator size="large" color={COR_PRIMARIA} />
					) : alunos.length === 0 ? (
						<Text style={styles.empty}>Nenhum aluno matriculado nesta turma.</Text>
					) : (
						alunos.map((item: any) => (
							<TouchableOpacity key={String(item.id_fetu)} style={styles.studentCard} onPress={() => alternar(item.id_fetu)} activeOpacity={0.8}>
								<View style={{ flex: 1 }}>
									<Text style={styles.studentName}>{item.nome}</Text>
									<Text style={styles.studentSub}>{item.telefone || 'Sem telefone'} • {item.email || 'Sem e-mail'}</Text>
								</View>
								<Ionicons
									name={item.presente ? 'checkbox' : 'square-outline'}
									size={30}
									color={item.presente ? '#198754' : '#999'}
								/>
							</TouchableOpacity>
						))
					)}

					<View style={styles.legend}>
						<Ionicons name="checkbox" size={20} color="#198754" />
						<Text style={styles.legendText}>Marcado = compareceu. Desmarcado = faltou.</Text>
					</View>
				</View>

				<TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={salvar} disabled={saving}>
					{saving ? <ActivityIndicator color="#FFF" /> : (
						<>
							<Ionicons name="save-outline" size={21} color="#FFF" />
							<Text style={styles.saveText}>Gravar Frequência</Text>
						</>
					)}
				</TouchableOpacity>

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
	label: { fontSize: 13, color: '#555', fontWeight: 'bold', marginBottom: 6 },
	input: { minHeight: 48, borderWidth: 1, borderColor: '#DADDE1', borderRadius: 8, backgroundColor: '#FAFAFA', paddingHorizontal: 12, color: '#222', marginBottom: 14 },
	dateRow: { flexDirection: 'row', gap: 8 },
	loadDateButton: { width: 48, height: 48, backgroundColor: '#0D6EFD', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	hint: { color: '#777', fontSize: 11, marginTop: 7 },
	empty: { textAlign: 'center', color: '#777', paddingVertical: 20 },
	studentCard: { borderWidth: 1, borderColor: '#E0E4E8', borderRadius: 9, padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FCFCFC' },
	studentName: { color: '#333', fontSize: 15, fontWeight: 'bold' },
	studentSub: { color: '#777', fontSize: 11, marginTop: 4 },
	legend: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
	legendText: { color: '#666', fontSize: 12, marginLeft: 7 },
	saveButton: { minHeight: 55, borderRadius: 10, backgroundColor: '#28A745', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
	saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
