import React from 'react';
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

export default function DocumentosScreen() {

	const handleAcaoDocumento = (nome: string, acao: 'Visualizar' | 'Baixar') => {
		if (acao === 'Baixar') {
			Alert.alert("Download Iniciado", `O arquivo "${nome}" será salvo no seu dispositivo.`);
		} else {
			Alert.alert("Abrindo Arquivo", `Preparando para exibir "${nome}"...`);
		}
	};

	const DocItem = ({ titulo, descricao, tamanho, tipo = "PDF", icone = "document-text" }: any) => (
		<View style={styles.docCard}>
			<View style={styles.docIconContainer}>
				<Ionicons name={icone} size={28} color={COR_PRIMARIA} />
			</View>

			<View style={styles.docInfo}>
				<Text style={styles.docTitle}>{titulo}</Text>
				<Text style={styles.docDesc}>{descricao}</Text>
				<View style={styles.docMetaRow}>
					<Text style={styles.docMetaText}>{tipo} • {tamanho}</Text>
				</View>
			</View>

			<View style={styles.docActions}>
				<TouchableOpacity
					style={styles.actionBtn}
					onPress={() => handleAcaoDocumento(titulo, 'Visualizar')}
				>
					<Ionicons name="eye-outline" size={22} color="#546E7A" />
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.actionBtn, { marginLeft: 8 }]}
					onPress={() => handleAcaoDocumento(titulo, 'Baixar')}
				>
					<Ionicons name="download-outline" size={22} color={COR_PRIMARIA} />
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<View style={styles.container}>
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Biblioteca e Documentos</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				<View style={styles.banner}>
					<Ionicons name="information-circle-outline" size={24} color={COR_PRIMARIA} />
					<Text style={styles.bannerText}>
						Aqui você encontra materiais de estudo, regimentos da Casa e seus certificados.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Materiais de Estudo (ESDE)</Text>

					<DocItem
						titulo="Apostila ESDE - Módulo 1"
						descricao="Introdução ao Espiritismo e história de Allan Kardec."
						tamanho="2.4 MB"
						icone="book"
					/>
					<DocItem
						titulo="O Livro dos Espíritos - Resumo"
						descricao="Mapa mental das 4 partes principais da obra."
						tamanho="1.1 MB"
						icone="map"
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Documentos Institucionais</Text>

					<DocItem
						titulo="Regimento Interno"
						descricao="Regras de convivência e funcionamento da Casa."
						tamanho="850 KB"
						icone="business"
					/>
					<DocItem
						titulo="Cartilha do Voluntário"
						descricao="Boas práticas para atendimento e passe."
						tamanho="1.5 MB"
						icone="people"
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Meus Certificados</Text>

					<DocItem
						titulo="Certificado - Curso de Passes"
						descricao="Concluído em 15/12/2025."
						tamanho="500 KB"
						icone="ribbon"
					/>
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

	content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

	banner: {
		backgroundColor: '#EBF4FC',
		borderRadius: 12,
		padding: 15,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 25,
		borderWidth: 1,
		borderColor: '#D6EAF8',
	},
	bannerText: {
		flex: 1,
		marginLeft: 12,
		fontSize: 13,
		color: '#2C3E50',
		lineHeight: 20,
	},

	section: { marginBottom: 25 },
	sectionTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#2C3E50',
		marginBottom: 15,
		borderLeftWidth: 4,
		borderLeftColor: COR_DETALHE,
		paddingLeft: 10,
	},

	docCard: {
		backgroundColor: '#FFF',
		borderRadius: 16,
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		elevation: 1,
	},
	docIconContainer: {
		width: 50,
		height: 50,
		borderRadius: 12,
		backgroundColor: '#F0F2F5',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 15,
	},
	docInfo: { flex: 1 },
	docTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
	docDesc: { fontSize: 13, color: '#7F8C8D', marginBottom: 6 },
	docMetaRow: { flexDirection: 'row', alignItems: 'center' },
	docMetaText: { fontSize: 11, color: '#95A5A6', fontWeight: '600' },

	docActions: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 10,
	},
	actionBtn: {
		padding: 8,
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
	}
});