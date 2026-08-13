import React, { useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Platform,
	Alert,
	Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F8F9FA';

export default function VoluntarioScreen() {
	const [aceitouTermos, setAceitouTermos] = useState(false);
	const [isSigned, setIsSigned] = useState(false);

	const handleAssinar = () => {
		if (!aceitouTermos) {
			Alert.alert("Atenção", "Você precisa ler e aceitar os termos antes de prosseguir.");
			return;
		}
		setIsSigned(true);
		Alert.alert(
			"Compromisso Firmado!",
			"Seu termo de voluntariado foi registrado com sucesso. Que o Mestre ilumine seu trabalho!",
			[{ text: "Amém", onPress: () => router.back() }]
		);
	};

	return (
		<View style={styles.container}>
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Termo de Voluntário</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				<View style={[styles.statusCard, isSigned && styles.statusCardSuccess]}>
					<Ionicons
						name={isSigned ? "checkmark-circle" : "document-text-outline"}
						size={32}
						color={isSigned ? "#FFF" : COR_DETALHE}
					/>
					<View style={styles.statusTextContainer}>
						<Text style={[styles.statusTitle, isSigned && { color: '#FFF' }]}>
							{isSigned ? "Termo Assinado" : "Aguardando Assinatura"}
						</Text>
						<Text style={[styles.statusSub, isSigned && { color: 'rgba(255,255,255,0.8)' }]}>
							{isSigned ? "Válido até 31/12/2026" : "Necessário para iniciar as atividades"}
						</Text>
					</View>
				</View>

				<View style={styles.termSection}>
					<Text style={styles.sectionTitle}>Termo de Adesão</Text>
					<View style={styles.textContainer}>
						<ScrollView nestedScrollEnabled={true} style={styles.innerScroll}>
							<Text style={styles.legalText}>
								Pelo presente instrumento, o VOLUNTÁRIO, acima qualificado, decide espontaneamente realizar atividade voluntária na entidade CASA DO CAMINHO, ciente da Lei nº 9.608, de 18/02/1998. {"\n\n"}
								1. O serviço voluntário não gera vínculo empregatício, nem obrigação de natureza trabalhista, previdenciária ou afim.{"\n\n"}
								2. O voluntário poderá ser ressarcido por despesas expressamente autorizadas pela diretoria da Casa.{"\n\n"}
								3. O voluntário se compromete a manter conduta ética e sigilo sobre informações de assistidos, conforme a LGPD (Lei 13.709/2018).{"\n\n"}
								4. O presente termo tem duração de 12 meses, podendo ser rescindido por qualquer das partes a qualquer momento.{"\n\n"}
								5. O voluntário autoriza o uso de sua imagem em divulgações institucionais de caridade.
							</Text>
						</ScrollView>
					</View>
				</View>

				<View style={styles.acceptanceArea}>
					<View style={styles.switchRow}>
						<Switch
							trackColor={{ false: "#767577", true: COR_PRIMARIA }}
							thumbColor={aceitouTermos ? COR_DETALHE : "#f4f3f4"}
							onValueChange={setAceitouTermos}
							value={aceitouTermos}
							disabled={isSigned}
						/>
						<Text style={styles.switchLabel}>Li e concordo com os termos acima</Text>
					</View>

					{!isSigned && (
						<TouchableOpacity
							style={[styles.btnSign, !aceitouTermos && styles.btnDisabled]}
							onPress={handleAssinar}
							disabled={!aceitouTermos}
						>
							<Text style={styles.btnSignText}>Confirmar Compromisso</Text>
						</TouchableOpacity>
					)}
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
		borderBottomLeftRadius: 25, borderBottomRightRadius: 25,
		elevation: 8, zIndex: 10,
	},
	backButton: { padding: 5 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
	content: { flex: 1, padding: 20 },

	statusCard: {
		backgroundColor: '#FFF',
		borderRadius: 20, padding: 20,
		flexDirection: 'row', alignItems: 'center',
		marginBottom: 25, borderWidth: 1, borderColor: '#E0E0E0',
		elevation: 2,
	},
	statusCardSuccess: { backgroundColor: '#2E7D32', borderColor: '#1B5E20' },
	statusTextContainer: { marginLeft: 15 },
	statusTitle: { fontSize: 17, fontWeight: 'bold', color: '#2C3E50' },
	statusSub: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },

	termSection: { flex: 1 },
	sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 15 },
	textContainer: {
		backgroundColor: '#FFF',
		borderRadius: 15, padding: 15,
		height: 300, borderWidth: 1, borderColor: '#E0E0E0',
	},
	innerScroll: { flex: 1 },
	legalText: { fontSize: 14, color: '#34495E', lineHeight: 22, textAlign: 'justify' },

	acceptanceArea: { marginTop: 25 },
	switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
	switchLabel: { marginLeft: 10, fontSize: 15, color: '#2C3E50', fontWeight: '500' },
	btnSign: {
		backgroundColor: COR_PRIMARIA,
		height: 55, borderRadius: 15,
		justifyContent: 'center', alignItems: 'center',
		elevation: 4,
	},
	btnSignText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
	btnDisabled: { opacity: 0.5 },
});