import React, { useState, useCallback } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Platform,
	Alert,
	ActivityIndicator,
	StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../src/services/apiService';
import MenuLateral from '@/components/MenuLateral';

const COR_PRIMARIA = '#1B2669';
const COR_FUNDO = '#F8F9FA';

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
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [filtroAtivo, setFiltroAtivo] = useState('Todos');
	const [atividades, setAtividades] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
	const [lembretes, setLembretes] = useState<number[]>([]);

	const carregarAgenda = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let codigo = '';
			let nivel = '';
			let idUsuario = '';

			if (session) {
				const user = JSON.parse(session);
				setUsuarioLogado(user);
				codigo = user.codigo_casa;
				nivel = user.nivel_acesso;
				idUsuario = user.id;
			} else {
				router.replace('/');
				return;
			}

			const lembretesSalvos = await AsyncStorage.getItem(`@lembretes_${idUsuario}`);
			if (lembretesSalvos) {
				setLembretes(JSON.parse(lembretesSalvos));
			}

			const response = await apiService.api.get(`api_listar_atividades.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				const ativas = resData.data.filter((a: any) => a.situacao === 'Ativa' || a.situacao === 'Ativo');
				setAtividades(ativas);
			}
		} catch (error) {
			console.log("Erro ao carregar agenda:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregarAgenda();
		}, [])
	);

	const handleLembrete = async (atividadeId: number, atividadeNome: string) => {
		if (!usuarioLogado) return;

		let novosLembretes = [...lembretes];
		const jaAtivo = novosLembretes.includes(atividadeId);

		if (jaAtivo) {
			novosLembretes = novosLembretes.filter(id => id !== atividadeId);
			Alert.alert("Lembrete Desativado", `Você não será mais avisado sobre: ${atividadeNome}`);
		} else {
			novosLembretes.push(atividadeId);
			Alert.alert(
				"Lembrete Ativado!",
				`Nós vamos te avisar antes de começar: ${atividadeNome}`,
				[{ text: "Ótimo!" }]
			);
		}

		setLembretes(novosLembretes);
		await AsyncStorage.setItem(`@lembretes_${usuarioLogado.id}`, JSON.stringify(novosLembretes));
	};

	const diasDaSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
	const diaDeHoje = diasDaSemana[new Date().getDay()];

	const atividadesFiltradas = atividades.filter(ativ => {
		if (filtroAtivo === 'Hoje') {
			return corrigeAcentos(ativ.dia_semana) === diaDeHoje;
		}
		return true;
	});

	const atividadesAgrupadas = atividadesFiltradas.reduce((acc: any, curr: any) => {
		const dia = corrigeAcentos(curr.dia_semana);
		if (!acc[dia]) acc[dia] = [];
		acc[dia].push(curr);
		return acc;
	}, {});

	const diasOrdenados = Object.keys(atividadesAgrupadas).sort((a, b) => diasDaSemana.indexOf(a) - diasDaSemana.indexOf(b));

	const FiltroBtn = ({ label }: { label: string }) => (
		<TouchableOpacity
			style={[styles.filtroBtn, filtroAtivo === label && styles.filtroBtnAtivo]}
			onPress={() => setFiltroAtivo(label)}
			activeOpacity={0.7}
		>
			<Text style={[styles.filtroTexto, filtroAtivo === label && styles.filtroTextoAtivo]}>
				{label}
			</Text>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>

				<Text style={styles.headerBarTitle}>Agenda da Casa</Text>

				<TouchableOpacity style={styles.menuButton} onPress={carregarAgenda}>
					<Ionicons name="refresh" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<View style={styles.filtrosContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
					<FiltroBtn label="Todos" />
					<FiltroBtn label="Hoje" />
					<FiltroBtn label="Palestras" />
					<FiltroBtn label="Estudos" />
				</ScrollView>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 40 }} />
				) : diasOrdenados.length === 0 ? (
					<View style={{ alignItems: 'center', marginTop: 50 }}>
						<Ionicons name="calendar-outline" size={60} color="#CCC" />
						<Text style={{ textAlign: 'center', color: '#7F8C8D', marginTop: 15, fontSize: 16 }}>
							Nenhuma atividade programada para {filtroAtivo === 'Hoje' ? 'hoje' : 'esta casa'}.
						</Text>
					</View>
				) : (
					diasOrdenados.map((dia) => (
						<View key={dia}>
							<Text style={styles.dateHeader}>Toda {dia}</Text>

							{atividadesAgrupadas[dia].map((ativ: any) => (
								<View key={ativ.id} style={styles.card}>
									<View style={styles.cardTimeColumn}>
										<Text style={styles.timeText}>{ativ.hora_inicial}</Text>
										<Text style={styles.timeEnd}>às {ativ.hora_final}</Text>
									</View>

									<View style={styles.cardContent}>
										<View style={styles.tagContainer}>
											<View style={[styles.tag, { backgroundColor: '#E3F2FD' }]}>
												<Text style={[styles.tagText, { color: '#1976D2' }]}>Atividade da Casa</Text>
											</View>
										</View>

										<Text style={styles.activityTitle}>{corrigeAcentos(ativ.nome)}</Text>

										<View style={styles.infoRow}>
											<Ionicons name="person" size={14} color="#7F8C8D" />
											<Text style={styles.infoText} numberOfLines={1}>Dirigente: {corrigeAcentos(ativ.coordenadores)}</Text>
										</View>

										<View style={styles.infoRow}>
											<Ionicons name="location" size={14} color="#7F8C8D" />
											<Text style={styles.infoText} numberOfLines={1}>{corrigeAcentos(ativ.instituicao)}</Text>
										</View>
									</View>

									<TouchableOpacity style={styles.bellBtn} onPress={() => handleLembrete(ativ.id, corrigeAcentos(ativ.nome))}>
										<Ionicons
											name={lembretes.includes(ativ.id) ? "notifications" : "notifications-outline"}
											size={24}
											color={COR_PRIMARIA}
										/>
									</TouchableOpacity>
								</View>
							))}
						</View>
					))
				)}

				<View style={{ height: 40 }} />
			</ScrollView>

			<MenuLateral
				isOpen={isMenuOpen}
				onClose={() => setIsMenuOpen(false)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },

	headerBar: {
		height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20),
		paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
		backgroundColor: COR_PRIMARIA,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		elevation: 5,
		zIndex: 10,
	},
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },

	filtrosContainer: {
		paddingTop: 15,
		paddingBottom: 15,
		backgroundColor: '#FFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
		elevation: 2,
	},
	filtroBtn: {
		paddingHorizontal: 18,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: '#F0F2F5',
		marginRight: 10,
		borderWidth: 1,
		borderColor: 'transparent',
	},
	filtroBtnAtivo: {
		backgroundColor: '#EBF4FC',
		borderColor: COR_PRIMARIA,
	},
	filtroTexto: { color: '#7F8C8D', fontSize: 14, fontWeight: '600' },
	filtroTextoAtivo: { color: COR_PRIMARIA, fontWeight: 'bold' },

	content: { flex: 1, paddingHorizontal: 20 },
	dateHeader: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#2C3E50',
		marginTop: 25,
		marginBottom: 15
	},
	card: {
		backgroundColor: '#FFF',
		borderRadius: 16,
		padding: 15,
		flexDirection: 'row',
		marginBottom: 15,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	cardTimeColumn: {
		width: 65,
		borderRightWidth: 1,
		borderRightColor: '#F0F2F5',
		alignItems: 'center',
		justifyContent: 'center',
		paddingRight: 10,
		marginRight: 15,
	},
	timeText: { fontSize: 18, fontWeight: 'bold', color: COR_PRIMARIA },
	timeEnd: { fontSize: 11, color: '#95A5A6', marginTop: 2 },

	cardContent: { flex: 1 },
	tagContainer: { flexDirection: 'row', marginBottom: 8 },
	tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
	tagText: { fontSize: 10, fontWeight: 'bold' },

	activityTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8, lineHeight: 22 },
	infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
	infoText: { fontSize: 12, color: '#546E7A', marginLeft: 6 },

	bellBtn: {
		position: 'absolute',
		top: 15,
		right: 15,
		padding: 5,
	}
});