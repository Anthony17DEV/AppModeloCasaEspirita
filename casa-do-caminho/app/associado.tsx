import React, { useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	Platform,
	StatusBar,
	Alert,
	Image
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import MenuLateral from '@/components/MenuLateral';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F4F6F8';

export default function AssociadoScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null);

	const planos = [
		{ id: '1', nome: 'Contribuinte Bronze', valor: '30,00', cor: '#CD7F32', icon: 'medal' },
		{ id: '2', nome: 'Contribuinte Prata', valor: '60,00', cor: '#C0C0C0', icon: 'award' },
		{ id: '3', nome: 'Contribuinte Ouro', valor: '100,00', cor: '#FFD700', icon: 'crown' },
	];

	const handleAdesao = () => {
		if (!planoSelecionado) {
			Alert.alert("Atenção", "Por favor, selecione um plano de contribuição.");
			return;
		}

		const plano = planos.find(p => p.id === planoSelecionado);

		Alert.alert(
			"Intenção de Adesão",
			`Irmão(ã), você selecionou o plano ${plano?.nome}. \n\nEm breve nossa equipe financeira entrará em contato para finalizar o cadastro e forma de pagamento.`,
			[{ text: "Entendido", onPress: () => router.back() }]
		);
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Torne-se Associado</Text>
				<TouchableOpacity style={styles.menuButton} onPress={() => router.back()}>
					<Ionicons name="close" size={28} color="#FFF" />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

				<View style={styles.heroSection}>
					<Image
						source={{ uri: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80' }}
						style={styles.heroImage}
					/>
					<View style={styles.heroOverlay}>
						<Text style={styles.heroTitle}>Sua mão ajuda a sustentar nossa obra.</Text>
						<Text style={styles.heroSubtitle}>Contribua mensalmente e ajude a manter nossas atividades assistenciais e espirituais.</Text>
					</View>
				</View>

				<View style={styles.contentPadding}>

					<Text style={styles.sectionTitle}>Por que ser um associado?</Text>
					<View style={styles.beneficiosContainer}>
						<View style={styles.beneficioItem}>
							<Ionicons name="checkmark-circle" size={20} color="#28a745" />
							<Text style={styles.beneficioText}>Manutenção das obras sociais e distribuição de cestas.</Text>
						</View>
						<View style={styles.beneficioItem}>
							<Ionicons name="checkmark-circle" size={20} color="#28a745" />
							<Text style={styles.beneficioText}>Sustento da estrutura física da nossa Casa.</Text>
						</View>
						<View style={styles.beneficioItem}>
							<Ionicons name="checkmark-circle" size={20} color="#28a745" />
							<Text style={styles.beneficioText}>Direito a voto em assembleias da instituição.</Text>
						</View>
					</View>

					<Text style={[styles.sectionTitle, { marginTop: 20 }]}>Escolha seu Plano de Contribuição</Text>

					{planos.map((plano) => (
						<TouchableOpacity
							key={plano.id}
							style={[
								styles.planoCard,
								planoSelecionado === plano.id && styles.planoCardAtivo
							]}
							onPress={() => setPlanoSelecionado(plano.id)}
							activeOpacity={0.8}
						>
							<View style={[styles.planoIconCircle, { backgroundColor: plano.cor + '20' }]}>
								<FontAwesome5 name={plano.icon} size={20} color={plano.cor} />
							</View>
							<View style={{ flex: 1, marginLeft: 15 }}>
								<Text style={styles.planoNome}>{plano.nome}</Text>
								<Text style={styles.planoValor}>R$ {plano.valor} / mês</Text>
							</View>
							{planoSelecionado === plano.id ? (
								<Ionicons name="radio-button-on" size={24} color={COR_PRIMARIA} />
							) : (
								<Ionicons name="radio-button-off" size={24} color="#CCC" />
							)}
						</TouchableOpacity>
					))}

					<TouchableOpacity style={styles.btnConfirmar} onPress={handleAdesao}>
						<Text style={styles.btnConfirmarText}>Confirmar Adesão</Text>
					</TouchableOpacity>

					<Text style={styles.infoFooter}>
						* A contribuição é voluntária e pode ser cancelada a qualquer momento solicitando à secretaria.
					</Text>

				</View>
				<View style={{ height: 40 }} />
			</ScrollView>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	scrollContent: { flex: 1 },

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

	heroSection: { height: 220, position: 'relative' },
	heroImage: { width: '100%', height: '100%' },
	heroOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(27, 38, 105, 0.7)',
		justifyContent: 'center',
		padding: 25
	},
	heroTitle: { color: COR_DETALHE, fontSize: 24, fontWeight: 'bold', lineHeight: 30 },
	heroSubtitle: { color: '#FFF', fontSize: 14, marginTop: 10, lineHeight: 20 },

	contentPadding: { padding: 20 },
	sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 15 },

	beneficiosContainer: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, elevation: 2, marginBottom: 10 },
	beneficioItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
	beneficioText: { marginLeft: 10, color: '#546E7A', fontSize: 14 },

	planoCard: {
		backgroundColor: '#FFF',
		flexDirection: 'row',
		alignItems: 'center',
		padding: 18,
		borderRadius: 15,
		marginBottom: 12,
		borderWidth: 2,
		borderColor: 'transparent',
		elevation: 2
	},
	planoCardAtivo: {
		borderColor: COR_PRIMARIA,
		backgroundColor: '#EBF4FC'
	},
	planoIconCircle: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
	planoNome: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
	planoValor: { fontSize: 14, color: '#7F8C8D', marginTop: 2 },

	btnConfirmar: {
		backgroundColor: '#28a745',
		padding: 18,
		borderRadius: 15,
		alignItems: 'center',
		marginTop: 20,
		elevation: 3
	},
	btnConfirmarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
	infoFooter: { textAlign: 'center', color: '#95A5A6', fontSize: 12, marginTop: 15, fontStyle: 'italic' }
});