import React, { useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Platform,
	Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F8F9FA';

export default function AtividadesScreen() {
	const [filtroAtivo, setFiltroAtivo] = useState('Hoje');

	const handleLembrete = (atividade: string) => {
		Alert.alert(
			"Lembrete Ativado!",
			`Nós vamos te avisar 30 minutos antes de começar: ${atividade}`,
			[{ text: "Ótimo!" }]
		);
	};

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
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Agenda de Atividades</Text>
				<TouchableOpacity style={styles.backButton}>
					<Ionicons name="calendar-outline" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<View style={styles.filtrosContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
					<FiltroBtn label="Hoje" />
					<FiltroBtn label="Esta Semana" />
					<FiltroBtn label="Palestras" />
					<FiltroBtn label="Estudos" />
				</ScrollView>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				<Text style={styles.dateHeader}>Terça-feira, 25 de Agosto</Text>

				<View style={styles.card}>
					<View style={styles.cardTimeColumn}>
						<Text style={styles.timeText}>19:30</Text>
						<Text style={styles.timeEnd}>às 21:00</Text>
					</View>

					<View style={styles.cardContent}>
						<View style={styles.tagContainer}>
							<View style={[styles.tag, { backgroundColor: '#E3F2FD' }]}>
								<Text style={[styles.tagText, { color: '#1976D2' }]}>Palestra Pública</Text>
							</View>
						</View>

						<Text style={styles.activityTitle}>O Evangelho Segundo o Espiritismo</Text>

						<View style={styles.infoRow}>
							<Ionicons name="person" size={14} color="#7F8C8D" />
							<Text style={styles.infoText}>Expositor: Ir. Carlos Eduardo</Text>
						</View>

						<View style={styles.infoRow}>
							<Ionicons name="location" size={14} color="#7F8C8D" />
							<Text style={styles.infoText}>Salão Principal</Text>
						</View>
					</View>

					<TouchableOpacity style={styles.bellBtn} onPress={() => handleLembrete("Palestra Pública")}>
						<Ionicons name="notifications-outline" size={22} color={COR_PRIMARIA} />
					</TouchableOpacity>
				</View>

				<View style={styles.card}>
					<View style={styles.cardTimeColumn}>
						<Text style={styles.timeText}>20:00</Text>
						<Text style={styles.timeEnd}>às 21:30</Text>
					</View>

					<View style={styles.cardContent}>
						<View style={styles.tagContainer}>
							<View style={[styles.tag, { backgroundColor: '#E8F5E9' }]}>
								<Text style={[styles.tagText, { color: '#2E7D32' }]}>Atendimento</Text>
							</View>
						</View>

						<Text style={styles.activityTitle}>Atendimento Fraterno (Passe)</Text>

						<View style={styles.infoRow}>
							<Ionicons name="people" size={14} color="#7F8C8D" />
							<Text style={styles.infoText}>Equipe de Passistas</Text>
						</View>

						<View style={styles.infoRow}>
							<Ionicons name="location" size={14} color="#7F8C8D" />
							<Text style={styles.infoText}>Salas 1 a 4</Text>
						</View>
					</View>

					<TouchableOpacity style={styles.bellBtn} onPress={() => handleLembrete("Atendimento Fraterno")}>
						<Ionicons name="notifications-outline" size={22} color={COR_PRIMARIA} />
					</TouchableOpacity>
				</View>

				<Text style={[styles.dateHeader, { marginTop: 10 }]}>Quinta-feira, 27 de Agosto</Text>

				<View style={styles.card}>
					<View style={styles.cardTimeColumn}>
						<Text style={styles.timeText}>19:00</Text>
						<Text style={styles.timeEnd}>às 20:30</Text>
					</View>

					<View style={styles.cardContent}>
						<View style={styles.tagContainer}>
							<View style={[styles.tag, { backgroundColor: '#FFF3E0' }]}>
								<Text style={[styles.tagText, { color: '#E65100' }]}>Grupo de Estudo</Text>
							</View>
						</View>

						<Text style={styles.activityTitle}>Estudo Sistematizado da Doutrina Espírita (ESDE)</Text>

						<View style={styles.infoRow}>
							<Ionicons name="book" size={14} color="#7F8C8D" />
							<Text style={styles.infoText}>Turma Iniciante - Módulo 1</Text>
						</View>
					</View>

					<TouchableOpacity style={styles.bellBtn} onPress={() => handleLembrete("ESDE")}>
						<Ionicons name="notifications-outline" size={22} color={COR_PRIMARIA} />
					</TouchableOpacity>
				</View>

				<View style={{ height: 40 }} />
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	headerBar: {
		backgroundColor: COR_PRIMARIA,
		paddingTop: Platform.OS === 'ios' ? 55 : 45,
		paddingBottom: 20,
		paddingHorizontal: 15,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomLeftRadius: 25,
		borderBottomRightRadius: 25,
		elevation: 8,
		zIndex: 10,
	},
	backButton: { padding: 5 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

	filtrosContainer: {
		marginTop: -15,
		paddingTop: 30,
		paddingBottom: 15,
		backgroundColor: '#FFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
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