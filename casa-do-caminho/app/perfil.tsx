import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Platform,
	KeyboardAvoidingView,
	Alert,
	ActivityIndicator,
	StatusBar,
	Image,
	Modal,
	PanResponder
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { apiService } from '../src/services/apiService';
import MenuLateral from '@/components/MenuLateral';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#f4f6f8';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	let texto = String(resposta || '').trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const start = texto.indexOf('{"success"');
		if (start !== -1) {
			let sub = texto.substring(start);
			const end = sub.lastIndexOf('}');
			if (end !== -1) return JSON.parse(sub.substring(0, end + 1));
		}
	} catch (e) { }
	return null;
};

const somenteNumeros = (valor: string) => String(valor || '').replace(/\D/g, '');

const formatarCPF = (valor: string) => {
	const numeros = somenteNumeros(valor).slice(0, 11);
	if (numeros.length <= 3) return numeros;
	if (numeros.length <= 6) return numeros.replace(/^(\d{3})(\d+)/, '$1.$2');
	if (numeros.length <= 9) return numeros.replace(/^(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
	return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
};

const formatarTelefone = (valor: string) => {
	const numeros = somenteNumeros(valor).slice(0, 11);
	if (!numeros) return '';
	if (numeros.length <= 2) return `(${numeros}`;
	if (numeros.length <= 6) return numeros.replace(/^(\d{2})(\d+)/, '($1) $2');
	if (numeros.length <= 10) return numeros.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
	return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
};

const formatarCEP = (valor: string) => {
	const numeros = somenteNumeros(valor).slice(0, 8);
	if (numeros.length <= 5) return numeros;
	return numeros.replace(/^(\d{5})(\d+)/, '$1-$2');
};

const formatarData = (valor: string) => {
	const numeros = somenteNumeros(valor).slice(0, 8);
	if (numeros.length <= 2) return numeros;
	if (numeros.length <= 4) return numeros.replace(/^(\d{2})(\d+)/, '$1/$2');
	return numeros.replace(/^(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
};

type FormPerfil = {
	nome: string;
	cpf: string;
	nascimento: string;
	nacionalidade: string;
	profissao: string;
	estadoCivil: string;
	naturalidade: string;
	telefone1: string;
	telefone2: string;
	email: string;
};

type EnderecoPerfil = {
	id: number;
	tipo: string;
	logradouro_tipo: string;
	cep: string;
	endereco: string;
	numero: string;
	complemento: string;
	bairro: string;
	cidade: string;
};

type AssociacaoPerfil = {
	ehAssociado: boolean;
	tipo: string;
	valorContribuicao: string;
	diaVencimento: string;
};

const FORM_VAZIO: FormPerfil = {
	nome: '', cpf: '', nascimento: '', nacionalidade: '', profissao: '',
	estadoCivil: '', naturalidade: '', telefone1: '', telefone2: '', email: ''
};

const ENDERECO_VAZIO: EnderecoPerfil = {
	id: 0, tipo: 'Principal', logradouro_tipo: '', cep: '', endereco: '',
	numero: '', complemento: '', bairro: '', cidade: ''
};

const ASSOCIACAO_VAZIA: AssociacaoPerfil = {
	ehAssociado: false,
	tipo: '',
	valorContribuicao: '',
	diaVencimento: ''
};

const formatarValorContribuicao = (valor: any) => {
	const numero = Number(valor || 0);
	if (!Number.isFinite(numero) || numero <= 0) return '';
	return numero.toFixed(2).replace('.', ',');
};

const valorContribuicaoNumero = (valor: string) => {
	const limpo = String(valor || '').trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
	return Number(limpo || 0);
};

type FotoParaCorte = {
	uri: string;
	width: number;
	height: number;
};

type RectCorte = {
	x: number;
	y: number;
	width: number;
	height: number;
};

const limitar = (valor: number, minimo: number, maximo: number) =>
	Math.max(minimo, Math.min(maximo, valor));

const calcularFrameImagem = (containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number) => {
	if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}
	const escala = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
	const width = imageWidth * escala;
	const height = imageHeight * escala;
	return {
		x: (containerWidth - width) / 2,
		y: (containerHeight - height) / 2,
		width,
		height,
	};
};

function CorteLivreFotoModal({ visible, foto, onCancelar, onConfirmar }: {
	visible: boolean;
	foto: FotoParaCorte | null;
	onCancelar: () => void;
	onConfirmar: (imagemBase64: string) => Promise<void> | void;
}) {
	const [area, setArea] = useState({ width: 0, height: 0 });
	const [rect, setRect] = useState<RectCorte>({ x: 0, y: 0, width: 0, height: 0 });
	const [processando, setProcessando] = useState(false);
	const inicioRef = useRef<RectCorte>(rect);
	const TAM_MIN = 60;

	const frame = useMemo(
		() => calcularFrameImagem(area.width, area.height, foto?.width || 0, foto?.height || 0),
		[area.width, area.height, foto?.width, foto?.height]
	);

	useEffect(() => {
		if (!visible || !foto || frame.width <= 0 || frame.height <= 0) return;
		const margemX = Math.max(12, frame.width * 0.08);
		const margemY = Math.max(12, frame.height * 0.08);
		setRect({
			x: frame.x + margemX,
			y: frame.y + margemY,
			width: Math.max(TAM_MIN, frame.width - margemX * 2),
			height: Math.max(TAM_MIN, frame.height - margemY * 2),
		});
	}, [visible, foto?.uri, frame.x, frame.y, frame.width, frame.height]);

	const rectAtualRef = useRef<RectCorte>(rect);
	const frameAtualRef = useRef(frame);

	useEffect(() => {
		rectAtualRef.current = rect;
	}, [rect]);

	useEffect(() => {
		frameAtualRef.current = frame;
	}, [frame.x, frame.y, frame.width, frame.height]);

	const moverResponder = useMemo(() => PanResponder.create({
		onStartShouldSetPanResponder: () => true,
		onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
		onPanResponderTerminationRequest: () => false,
		onPanResponderGrant: () => {
			inicioRef.current = { ...rectAtualRef.current };
		},
		onPanResponderMove: (_, gesture) => {
			const i = inicioRef.current;
			const f = frameAtualRef.current;
			const novo = {
				...i,
				x: limitar(i.x + gesture.dx, f.x, f.x + f.width - i.width),
				y: limitar(i.y + gesture.dy, f.y, f.y + f.height - i.height),
			};
			rectAtualRef.current = novo;
			setRect(novo);
		},
	}), []);

	const resizeResponders = useMemo(() => {
		const criar = (canto: 'tl' | 'tr' | 'bl' | 'br') => PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 1 || Math.abs(gesture.dy) > 1,
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: () => {
				inicioRef.current = { ...rectAtualRef.current };
			},
			onPanResponderMove: (_, gesture) => {
				const i = inicioRef.current;
				const f = frameAtualRef.current;
				let x = i.x;
				let y = i.y;
				let width = i.width;
				let height = i.height;

				if (canto === 'br' || canto === 'tr') {
					width = limitar(i.width + gesture.dx, TAM_MIN, f.x + f.width - i.x);
				}
				if (canto === 'bl' || canto === 'tl') {
					const novoX = limitar(i.x + gesture.dx, f.x, i.x + i.width - TAM_MIN);
					width = i.width + (i.x - novoX);
					x = novoX;
				}
				if (canto === 'br' || canto === 'bl') {
					height = limitar(i.height + gesture.dy, TAM_MIN, f.y + f.height - i.y);
				}
				if (canto === 'tr' || canto === 'tl') {
					const novoY = limitar(i.y + gesture.dy, f.y, i.y + i.height - TAM_MIN);
					height = i.height + (i.y - novoY);
					y = novoY;
				}

				const novo = { x, y, width, height };
				rectAtualRef.current = novo;
				setRect(novo);
			},
		});

		return {
			tl: criar('tl'),
			tr: criar('tr'),
			bl: criar('bl'),
			br: criar('br'),
		};
	}, []);

	const gerarImagem = async (usarInteira = false) => {
		if (!foto || processando) return;
		setProcessando(true);
		try {
			const actions: ImageManipulator.Action[] = [];
			if (!usarInteira) {
				const escalaX = foto.width / frame.width;
				const escalaY = foto.height / frame.height;
				const originX = Math.round(limitar((rect.x - frame.x) * escalaX, 0, foto.width - 1));
				const originY = Math.round(limitar((rect.y - frame.y) * escalaY, 0, foto.height - 1));
				const width = Math.round(limitar(rect.width * escalaX, 1, foto.width - originX));
				const height = Math.round(limitar(rect.height * escalaY, 1, foto.height - originY));
				actions.push({ crop: { originX, originY, width, height } });
			}

			const resultado = await ImageManipulator.manipulateAsync(
				foto.uri,
				actions,
				{ compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
			);
			if (!resultado.base64) throw new Error('Falha ao gerar imagem.');
			await onConfirmar(`data:image/jpeg;base64,${resultado.base64}`);
		} catch (error) {
			console.log('[PERFIL] Erro no corte livre:', error);
			Alert.alert('Erro', 'Não foi possível recortar a foto.');
		} finally {
			setProcessando(false);
		}
	};

	if (!foto) return null;

	return (
		<Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancelar}>
			<View style={styles.cropModalContainer}>
				<StatusBar barStyle="light-content" backgroundColor="#111" />
				<View style={styles.cropHeader}>
					<TouchableOpacity onPress={onCancelar} disabled={processando} style={styles.cropHeaderButton}>
						<Feather name="x" size={26} color="#FFF" />
					</TouchableOpacity>
					<View style={{ flex: 1 }}>
						<Text style={styles.cropTitle}>Cortar foto</Text>
						<Text style={styles.cropSubtitle}>Puxe as pontas para usar qualquer proporção</Text>
					</View>
					<View style={styles.cropHeaderButton} />
				</View>

				<View style={styles.cropStage} onLayout={(event) => setArea({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
					{frame.width > 0 && (
						<Image source={{ uri: foto.uri }} style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.width, height: frame.height }} resizeMode="stretch" />
					)}

					<View pointerEvents="none" style={[styles.cropShade, { left: 0, top: 0, right: 0, height: rect.y }]} />
					<View pointerEvents="none" style={[styles.cropShade, { left: 0, top: rect.y, width: rect.x, height: rect.height }]} />
					<View pointerEvents="none" style={[styles.cropShade, { left: rect.x + rect.width, top: rect.y, right: 0, height: rect.height }]} />
					<View pointerEvents="none" style={[styles.cropShade, { left: 0, top: rect.y + rect.height, right: 0, bottom: 0 }]} />

					<View style={[styles.cropSelection, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]}>
						<View style={styles.cropMoveArea} {...moverResponder.panHandlers} />
						<View pointerEvents="none" style={styles.cropGridV1} />
						<View pointerEvents="none" style={styles.cropGridV2} />
						<View pointerEvents="none" style={styles.cropGridH1} />
						<View pointerEvents="none" style={styles.cropGridH2} />
						<View style={[styles.cropHandle, styles.cropHandleTL]} {...resizeResponders.tl.panHandlers} />
						<View style={[styles.cropHandle, styles.cropHandleTR]} {...resizeResponders.tr.panHandlers} />
						<View style={[styles.cropHandle, styles.cropHandleBL]} {...resizeResponders.bl.panHandlers} />
						<View style={[styles.cropHandle, styles.cropHandleBR]} {...resizeResponders.br.panHandlers} />
					</View>
				</View>

				<View style={styles.cropFooter}>
					<TouchableOpacity style={styles.cropSecondaryButton} onPress={() => gerarImagem(true)} disabled={processando}>
						<Text style={styles.cropSecondaryText}>Usar foto inteira</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.cropPrimaryButton} onPress={() => gerarImagem(false)} disabled={processando}>
						{processando ? <ActivityIndicator color="#FFF" /> : (<>
							<Feather name="crop" size={18} color="#FFF" />
							<Text style={styles.cropPrimaryText}>Usar este corte</Text>
						</>)}
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

export default function PerfilScreen() {
	const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isPrimeiroAcesso, setIsPrimeiroAcesso] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingPerfil, setIsLoadingPerfil] = useState(true);
	const [isSavingPhoto, setIsSavingPhoto] = useState(false);

	const [form, setForm] = useState<FormPerfil>(FORM_VAZIO);
	const [endereco, setEndereco] = useState<EnderecoPerfil>(ENDERECO_VAZIO);
	const [associacao, setAssociacao] = useState<AssociacaoPerfil>(ASSOCIACAO_VAZIA);
	const [novaSenha, setNovaSenha] = useState('');
	const [confirmarSenha, setConfirmarSenha] = useState('');
	const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
	const [fotoParaCorte, setFotoParaCorte] = useState<FotoParaCorte | null>(null);

	const preencherDadosPerfil = (dados: any, userFallback?: any) => {
		const f = dados?.form || {};
		const e = dados?.endereco || {};

		setForm({
			nome: String(f.nome ?? userFallback?.nome ?? ''),
			cpf: formatarCPF(String(f.cpf ?? userFallback?.cpf ?? '')),
			nascimento: formatarData(String(f.nascimento ?? '')),
			nacionalidade: String(f.nacionalidade ?? ''),
			profissao: String(f.profissao ?? ''),
			estadoCivil: String(f.estadoCivil ?? ''),
			naturalidade: String(f.naturalidade ?? ''),
			telefone1: formatarTelefone(String(f.telefone1 ?? userFallback?.telefone ?? '')),
			telefone2: formatarTelefone(String(f.telefone2 ?? '')),
			email: String(f.email ?? userFallback?.email ?? '')
		});

		setEndereco({
			id: Number(e.id || 0),
			tipo: String(e.tipo || 'Principal'),
			logradouro_tipo: String(e.logradouro_tipo || ''),
			cep: formatarCEP(String(e.cep || '')),
			endereco: String(e.endereco || ''),
			numero: String(e.numero || ''),
			complemento: String(e.complemento || ''),
			bairro: String(e.bairro || ''),
			cidade: String(e.cidade || '')
		});

		const a = dados?.associacao || {};
		setAssociacao({
			ehAssociado: Boolean(a.eh_associado),
			tipo: String(a.tipo || ''),
			valorContribuicao: formatarValorContribuicao(a.valor_contribuicao),
			diaVencimento: a.dia_vencimento ? String(a.dia_vencimento) : ''
		});

		const foto = String(dados?.foto_perfil || userFallback?.foto_perfil || '');
		setFotoPerfil(foto || null);
	};

	const carregarPerfil = async (userParam?: any) => {
		const user = userParam || usuarioLogado;
		if (!user?.id) return;

		setIsLoadingPerfil(true);
		try {
			const response = await apiService.api.get(`api_buscar_meu_perfil.php?id_usuario=${encodeURIComponent(String(user.id))}`);
			const resData = parseJSONSeguro(response.data);

			if (resData?.success) {
				preencherDadosPerfil(resData.data, user);
			} else {
				preencherDadosPerfil(null, user);
				Alert.alert('Atenção', resData?.message || 'Não foi possível carregar todos os dados do perfil.');
			}
		} catch (error) {
			preencherDadosPerfil(null, user);
			Alert.alert('Erro', 'Não foi possível carregar os dados completos do perfil.');
		} finally {
			setIsLoadingPerfil(false);
		}
	};

	useEffect(() => {
		const carregarSessao = async () => {
			const session = await AsyncStorage.getItem('@user_session');
			if (!session) {
				router.replace('/');
				return;
			}

			const user = JSON.parse(session);
			setUsuarioLogado(user);

			const primeiro = user.primeiro_acesso == 1;
			setIsPrimeiroAcesso(primeiro);
			setIsEditing(primeiro);

			await carregarPerfil(user);

			if (primeiro) {
				Alert.alert('Atenção', 'Por questões de segurança, você precisa criar uma nova senha antes de continuar. Aproveite para conferir seus dados.');
			}
		};

		carregarSessao();
	}, []);

	const salvarFotoImediatamente = async (imageUri: string) => {
		if (!usuarioLogado?.id) return;

		const fotoAnterior = fotoPerfil;
		setFotoPerfil(imageUri);
		setIsSavingPhoto(true);

		try {
			const response = await apiService.api.post('api_atualizar_foto_perfil.php', {
				id_usuario: usuarioLogado.id,
				foto_perfil: imageUri
			});
			const resData = parseJSONSeguro(response.data);

			if (!resData?.success) {
				setFotoPerfil(fotoAnterior);
				Alert.alert('Erro', resData?.message || 'Não foi possível atualizar a foto.');
				return;
			}

			const updatedUser = { ...usuarioLogado, foto_perfil: imageUri };
			setUsuarioLogado(updatedUser);
			await AsyncStorage.setItem('@user_session', JSON.stringify(updatedUser));
		} catch (error) {
			setFotoPerfil(fotoAnterior);
			Alert.alert('Erro', 'Não foi possível salvar a foto de perfil.');
		} finally {
			setIsSavingPhoto(false);
		}
	};

	const aplicarFotoSelecionada = (result: ImagePicker.ImagePickerResult) => {
		if (result.canceled || !result.assets || result.assets.length === 0) return;
		const asset = result.assets[0];
		if (!asset.uri || !asset.width || !asset.height) {
			Alert.alert('Erro', 'Não foi possível processar a foto selecionada.');
			return;
		}
		setFotoParaCorte({ uri: asset.uri, width: asset.width, height: asset.height });
	};

	const tirarFotoCamera = async () => {
		try {
			const permissao = await ImagePicker.requestCameraPermissionsAsync();
			if (!permissao.granted) {
				Alert.alert('Permissão necessária', 'Permita o acesso à câmera para tirar uma foto de perfil.');
				return;
			}

			const result = await ImagePicker.launchCameraAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: false,
				quality: 1,
			});

			aplicarFotoSelecionada(result);
		} catch (error) {
			Alert.alert('Erro', 'Não foi possível abrir a câmera.');
		}
	};

	const escolherFotoGaleria = async () => {
		try {
			const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permissao.granted) {
				Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher uma imagem de perfil.');
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: false,
				quality: 1,
			});

			aplicarFotoSelecionada(result);
		} catch (error) {
			Alert.alert('Erro', 'Não foi possível abrir a galeria.');
		}
	};

	const handleEscolherFoto = () => {
		if (isSavingPhoto) return;
		Alert.alert(
			'Alterar foto de perfil',
			'Escolha a foto. Depois você poderá cortar livremente, sem proporção fixa.',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{ text: 'Tirar foto', onPress: tirarFotoCamera },
				{ text: 'Escolher da galeria', onPress: escolherFotoGaleria }
			]
		);
	};

	const buscarCep = async () => {
		const cep = somenteNumeros(endereco.cep);
		if (cep.length !== 8 || !isEditing) return;

		try {
			const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
			const data = await response.json();
			if (!data?.erro) {
				setEndereco(prev => ({
					...prev,
					endereco: data.logradouro || prev.endereco,
					bairro: data.bairro || prev.bairro,
					cidade: data.localidade || prev.cidade
				}));
			}
		} catch (error) {
			console.log('[PERFIL] Erro ao consultar CEP:', error);
		}
	};

	const handleEditarCancelar = async () => {
		if (!isEditing) {
			setIsEditing(true);
			return;
		}

		setNovaSenha('');
		setConfirmarSenha('');
		setIsEditing(false);
		await carregarPerfil();
	};

	const handleSalvar = async () => {
		const cpfLimpo = somenteNumeros(form.cpf);
		const telefoneLimpo = somenteNumeros(form.telefone1);

		if (!form.nome.trim()) {
			Alert.alert('Atenção', 'O nome é obrigatório.');
			return;
		}
		if (cpfLimpo.length !== 11) {
			Alert.alert('Atenção', 'Informe um CPF válido.');
			return;
		}
		if (telefoneLimpo.length < 10) {
			Alert.alert('Atenção', 'O Telefone 1 é obrigatório.');
			return;
		}

		if (associacao.ehAssociado) {
			const valor = valorContribuicaoNumero(associacao.valorContribuicao);
			const dia = Number(somenteNumeros(associacao.diaVencimento));

			if (valor <= 0) {
				Alert.alert('Atenção', 'Informe um valor de contribuição maior que zero.');
				return;
			}
			if (dia < 1 || dia > 31) {
				Alert.alert('Atenção', 'O dia de vencimento deve estar entre 1 e 31.');
				return;
			}
		}

		if (isPrimeiroAcesso && novaSenha.length < 4) {
			Alert.alert('Erro', 'A nova senha deve ter no mínimo 4 caracteres.');
			return;
		}

		if (novaSenha || confirmarSenha) {
			if (novaSenha.length < 4) {
				Alert.alert('Erro', 'A nova senha deve ter no mínimo 4 caracteres.');
				return;
			}
			if (novaSenha !== confirmarSenha) {
				Alert.alert('Erro', 'As senhas não coincidem!');
				return;
			}
		}

		setIsLoading(true);
		try {
			const payload = {
				id_usuario: usuarioLogado.id,
				nome: form.nome.trim(),
				cpf: cpfLimpo,
				nascimento: form.nascimento,
				nacionalidade: form.nacionalidade,
				profissao: form.profissao,
				estado_civil: form.estadoCivil,
				naturalidade: form.naturalidade,
				telefone1: form.telefone1,
				telefone2: form.telefone2,
				email: form.email,
				nova_senha: novaSenha,
				endereco: endereco,
				valor_contribuicao: associacao.ehAssociado ? associacao.valorContribuicao : undefined,
				dia_vencimento: associacao.ehAssociado ? Number(somenteNumeros(associacao.diaVencimento)) : undefined
			};

			const response = await apiService.api.post('api_atualizar_perfil.php', payload);
			const resData = parseJSONSeguro(response.data);

			if (resData?.success) {
				const updatedUser = {
					...usuarioLogado,
					nome: form.nome.trim(),
					cpf: cpfLimpo,
					email: form.email,
					telefone: form.telefone1,
					primeiro_acesso: 0,
					foto_perfil: fotoPerfil
				};

				setUsuarioLogado(updatedUser);
				await AsyncStorage.setItem('@user_session', JSON.stringify(updatedUser));
				await AsyncStorage.setItem('@last_user_login', JSON.stringify({
					nome: updatedUser.nome,
					cpf: cpfLimpo,
					codigo: updatedUser.codigo_casa
				}));

				setNovaSenha('');
				setConfirmarSenha('');
				setIsEditing(false);

				if (isPrimeiroAcesso) {
					setIsPrimeiroAcesso(false);
					Alert.alert('Perfil atualizado', 'Seus dados foram salvos e sua nova senha foi criada.', [
						{ text: 'Continuar', onPress: () => router.replace('/home') }
					]);
				} else {
					Alert.alert('Sucesso!', 'Perfil atualizado com sucesso.');
				}
			} else {
				Alert.alert('Erro', resData?.message || 'Erro ao atualizar perfil.');
			}
		} catch (error) {
			Alert.alert('Erro de Conexão', 'Não foi possível comunicar com o servidor.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogout = () => {
		Alert.alert(
			'Sair da Conta',
			'Tem certeza que deseja sair do aplicativo?',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{
					text: 'Sair',
					style: 'destructive',
					onPress: async () => {
						await AsyncStorage.removeItem('@user_session');
						router.replace('/');
					}
				}
			]
		);
	};

	const Campo = ({ label, value, onChangeText, icon, keyboardType = 'default', maxLength, placeholder, onBlur }: any) => (
		<View style={styles.inputContainer}>
			<Text style={styles.label}>{label}</Text>
			<View style={[styles.inputWrapper, !isEditing && styles.inputDisabled]}>
				<Ionicons name={icon} size={20} color="#7F8C8D" style={styles.inputIcon} />
				<TextInput
					style={styles.input}
					value={value}
					onChangeText={onChangeText}
					editable={isEditing}
					keyboardType={keyboardType}
					maxLength={maxLength}
					placeholder={placeholder}
					placeholderTextColor="#AAA"
					onBlur={onBlur}
				/>
			</View>
		</View>
	);

	if (!usuarioLogado || isLoadingPerfil) {
		return (
			<View style={[styles.container, styles.loadingScreen]}>
				<ActivityIndicator size="large" color={COR_PRIMARIA} />
				<Text style={styles.loadingText}>Carregando perfil...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				{!isPrimeiroAcesso ? (
					<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
						<Ionicons name="menu" size={28} color="#FFF" />
					</TouchableOpacity>
				) : <View style={{ width: 48 }} />}

				<Text style={styles.headerBarTitle}>{isPrimeiroAcesso ? 'Complete seu Perfil' : 'Meu Perfil'}</Text>
				<View style={{ width: 48 }} />
			</View>

			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
				<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>

					<View style={styles.avatarSection}>
						<View style={styles.avatarContainer}>
							{fotoPerfil ? (
								<Image source={{ uri: fotoPerfil }} style={styles.avatarImage} resizeMode="cover" />
							) : (
								<Ionicons name="person" size={60} color={COR_PRIMARIA} />
							)}

							{isSavingPhoto && (
								<View style={styles.photoLoadingOverlay}>
									<ActivityIndicator color="#FFF" />
								</View>
							)}

							<TouchableOpacity style={styles.editAvatarButton} onPress={handleEscolherFoto} disabled={isSavingPhoto}>
								<Ionicons name="camera" size={16} color="#1B2669" />
							</TouchableOpacity>
						</View>
						<Text style={styles.photoHint}>A foto é salva automaticamente</Text>
						<Text style={styles.userName}>{form.nome}</Text>
						<Text style={styles.userRole}>{usuarioLogado.nivel_acesso} | Casa: {usuarioLogado.codigo_casa}</Text>
					</View>

					<View style={styles.sectionContainer}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Dados Pessoais</Text>
							{!isPrimeiroAcesso && (
								<TouchableOpacity onPress={handleEditarCancelar}>
									<Text style={styles.editToggleText}>{isEditing ? 'Cancelar' : 'Editar'}</Text>
								</TouchableOpacity>
							)}
						</View>

						<Campo label="Nome Completo *" icon="person-outline" value={form.nome} onChangeText={(v: string) => setForm({ ...form, nome: v })} />
						<Campo label="CPF (Login) *" icon="card-outline" value={form.cpf} onChangeText={(v: string) => setForm({ ...form, cpf: formatarCPF(v) })} keyboardType="numeric" maxLength={14} />
						<Campo label="Nascimento" icon="calendar-outline" value={form.nascimento} onChangeText={(v: string) => setForm({ ...form, nascimento: formatarData(v) })} keyboardType="numeric" maxLength={10} placeholder="DD/MM/AAAA" />
						<Campo label="Nacionalidade" icon="flag-outline" value={form.nacionalidade} onChangeText={(v: string) => setForm({ ...form, nacionalidade: v })} />
						<Campo label="Profissão" icon="briefcase-outline" value={form.profissao} onChangeText={(v: string) => setForm({ ...form, profissao: v })} />
						<Campo label="Estado Civil" icon="people-outline" value={form.estadoCivil} onChangeText={(v: string) => setForm({ ...form, estadoCivil: v })} />
						<Campo label="Naturalidade" icon="location-outline" value={form.naturalidade} onChangeText={(v: string) => setForm({ ...form, naturalidade: v })} />
					</View>

					<View style={styles.sectionContainer}>
						<Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Contato</Text>
						<Campo label="Telefone 1 / WhatsApp *" icon="logo-whatsapp" value={form.telefone1} onChangeText={(v: string) => setForm({ ...form, telefone1: formatarTelefone(v) })} keyboardType="phone-pad" maxLength={15} placeholder="(99) 99999-9999" />
						<Campo label="Telefone 2" icon="call-outline" value={form.telefone2} onChangeText={(v: string) => setForm({ ...form, telefone2: formatarTelefone(v) })} keyboardType="phone-pad" maxLength={15} placeholder="(99) 99999-9999" />
						<Campo label="E-mail" icon="mail-outline" value={form.email} onChangeText={(v: string) => setForm({ ...form, email: v })} keyboardType="email-address" />
					</View>

					{associacao.ehAssociado && (
						<View style={styles.sectionContainer}>
							<View style={styles.associationHeader}>
								<View>
									<Text style={styles.sectionTitle}>Minha Associação</Text>
									<Text style={styles.associationSubtitle}>Dados atuais da sua contribuição mensal</Text>
								</View>
								<View style={styles.associationBadge}>
									<Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
									<Text style={styles.associationBadgeText}>ASSOCIADO</Text>
								</View>
							</View>

							<Campo
								label="Valor da Contribuição (R$) *"
								icon="cash-outline"
								value={associacao.valorContribuicao}
								onChangeText={(v: string) => setAssociacao({ ...associacao, valorContribuicao: v.replace(/[^\d,.]/g, '') })}
								keyboardType="decimal-pad"
								placeholder="Ex.: 200,00"
							/>
							<Campo
								label="Dia do Vencimento *"
								icon="calendar-number-outline"
								value={associacao.diaVencimento}
								onChangeText={(v: string) => setAssociacao({ ...associacao, diaVencimento: somenteNumeros(v).slice(0, 2) })}
								keyboardType="numeric"
								maxLength={2}
								placeholder="1 a 31"
							/>
							<Text style={styles.associationNote}>
								Ao alterar esses dados, as mensalidades pendentes do ano serão recalculadas com o novo valor e vencimento.
							</Text>
						</View>
					)}

					<View style={styles.sectionContainer}>
						<Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Endereço Principal</Text>
						<Campo label="Tipo de Endereço" icon="home-outline" value={endereco.tipo} onChangeText={(v: string) => setEndereco({ ...endereco, tipo: v })} placeholder="Principal, Residencial..." />
						<Campo label="CEP" icon="navigate-outline" value={endereco.cep} onChangeText={(v: string) => setEndereco({ ...endereco, cep: formatarCEP(v) })} keyboardType="numeric" maxLength={9} onBlur={buscarCep} />
						<Campo label="Tipo de Logradouro" icon="map-outline" value={endereco.logradouro_tipo} onChangeText={(v: string) => setEndereco({ ...endereco, logradouro_tipo: v })} placeholder="Rua, Avenida, Travessa..." />
						<Campo label="Endereço" icon="location-outline" value={endereco.endereco} onChangeText={(v: string) => setEndereco({ ...endereco, endereco: v })} />
						<Campo label="Número" icon="keypad-outline" value={endereco.numero} onChangeText={(v: string) => setEndereco({ ...endereco, numero: v })} />
						<Campo label="Complemento" icon="business-outline" value={endereco.complemento} onChangeText={(v: string) => setEndereco({ ...endereco, complemento: v })} />
						<Campo label="Bairro" icon="map-outline" value={endereco.bairro} onChangeText={(v: string) => setEndereco({ ...endereco, bairro: v })} />
						<Campo label="Cidade" icon="business-outline" value={endereco.cidade} onChangeText={(v: string) => setEndereco({ ...endereco, cidade: v })} />
					</View>

					{isEditing && (
						<View style={styles.sectionContainer}>
							<Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Segurança</Text>
							<View style={styles.inputContainer}>
								<Text style={styles.label}>{isPrimeiroAcesso ? 'Crie uma Nova Senha *' : 'Nova Senha (Opcional)'}</Text>
								<View style={styles.inputWrapper}>
									<Ionicons name="lock-closed-outline" size={20} color="#7F8C8D" style={styles.inputIcon} />
									<TextInput style={styles.input} placeholder="Digite a nova senha" placeholderTextColor="#AAA" secureTextEntry value={novaSenha} onChangeText={setNovaSenha} autoCapitalize="none" autoCorrect={false} />
								</View>
							</View>

							<View style={styles.inputContainer}>
								<Text style={styles.label}>Confirmar Senha{isPrimeiroAcesso ? ' *' : ''}</Text>
								<View style={styles.inputWrapper}>
									<Ionicons name="shield-checkmark-outline" size={20} color="#7F8C8D" style={styles.inputIcon} />
									<TextInput style={styles.input} placeholder="Repita a senha" placeholderTextColor="#AAA" secureTextEntry value={confirmarSenha} onChangeText={setConfirmarSenha} autoCapitalize="none" autoCorrect={false} />
								</View>
							</View>
						</View>
					)}

					{isEditing ? (
						<TouchableOpacity style={styles.btnSalvarFull} onPress={handleSalvar} disabled={isLoading}>
							{isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSalvarFullText}>{isPrimeiroAcesso ? 'Salvar e Entrar' : 'Salvar Alterações'}</Text>}
						</TouchableOpacity>
					) : (
						!isPrimeiroAcesso && (
							<TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
								<Feather name="log-out" size={20} color="#FFF" style={{ marginRight: 8 }} />
								<Text style={styles.btnLogoutText}>Sair da Conta</Text>
							</TouchableOpacity>
						)
					)}

					<View style={{ height: 40 }} />
				</ScrollView>
			</KeyboardAvoidingView>

			<CorteLivreFotoModal
				visible={!!fotoParaCorte}
				foto={fotoParaCorte}
				onCancelar={() => setFotoParaCorte(null)}
				onConfirmar={async (imagemBase64) => {
					setFotoParaCorte(null);
					await salvarFotoImediatamente(imagemBase64);
				}}
			/>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	scrollContent: { flex: 1, backgroundColor: COR_FUNDO },
	loadingScreen: { justifyContent: 'center', alignItems: 'center' },
	loadingText: { color: '#666', marginTop: 12, fontSize: 14 },
	headerBar: {
		height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20),
		paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
		backgroundColor: COR_PRIMARIA,
		flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		paddingHorizontal: 10, elevation: 5, zIndex: 10,
	},
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
	avatarSection: { alignItems: 'center', marginTop: 15, marginBottom: 20 },
	avatarContainer: {
		width: 110, height: 110, borderRadius: 55, backgroundColor: '#EBF4FC',
		justifyContent: 'center', alignItems: 'center', borderWidth: 3,
		borderColor: COR_DETALHE, position: 'relative', elevation: 3, overflow: 'visible'
	},
	avatarImage: { width: 104, height: 104, borderRadius: 52 },
	photoLoadingOverlay: {
		position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
		borderRadius: 55, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'center', alignItems: 'center'
	},
	editAvatarButton: {
		position: 'absolute', bottom: 0, right: -5, backgroundColor: COR_DETALHE,
		width: 34, height: 34, borderRadius: 17, justifyContent: 'center',
		alignItems: 'center', borderWidth: 2, borderColor: '#FFF',
	},
	photoHint: { fontSize: 11, color: '#7F8C8D', marginTop: 9 },
	userName: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', marginTop: 8 },
	userRole: { fontSize: 14, color: '#7F8C8D', marginTop: 4, fontWeight: '500' },
	sectionContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 20 },
	sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 7 },
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA },
	editToggleText: { fontSize: 13, color: COR_FUNDO, fontWeight: 'bold', backgroundColor: COR_PRIMARIA, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
	associationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15, gap: 10 },
	associationSubtitle: { color: '#7F8C8D', fontSize: 12, marginTop: 4 },
	associationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, gap: 4 },
	associationBadgeText: { color: '#2E7D32', fontSize: 10, fontWeight: 'bold' },
	associationNote: { color: '#6B7280', fontSize: 12, lineHeight: 18, backgroundColor: '#F7F8FA', borderRadius: 8, padding: 10 },
	inputContainer: { marginBottom: 15 },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
	inputWrapper: {
		flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9',
		borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, minHeight: 50,
	},
	inputDisabled: { backgroundColor: '#f0f0f0', borderColor: '#eee' },
	inputIcon: { marginRight: 10 },
	input: { flex: 1, fontSize: 14, color: '#000', paddingVertical: 12 },
	btnSalvarFull: {
		backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center',
		alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10,
	},
	btnSalvarFullText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
	btnLogout: {
		backgroundColor: '#ED1C24', flexDirection: 'row', justifyContent: 'center',
		alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10,
	},
	btnLogoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
	cropModalContainer: { flex: 1, backgroundColor: '#111' },
	cropHeader: {
		minHeight: Platform.OS === 'ios' ? 100 : 72 + (StatusBar.currentHeight || 0),
		paddingTop: Platform.OS === 'ios' ? 46 : StatusBar.currentHeight,
		paddingHorizontal: 12, backgroundColor: '#111', flexDirection: 'row', alignItems: 'center',
	},
	cropHeaderButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
	cropTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
	cropSubtitle: { color: '#AAA', fontSize: 12, textAlign: 'center', marginTop: 2 },
	cropStage: { flex: 1, backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
	cropShade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.58)' },
	cropSelection: { position: 'absolute', borderWidth: 2, borderColor: '#FFF' },
	cropMoveArea: { position: 'absolute', left: 18, right: 18, top: 18, bottom: 18, backgroundColor: 'transparent' },
	cropHandle: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 4, borderColor: COR_PRIMARIA },
	cropHandleTL: { left: -14, top: -14 },
	cropHandleTR: { right: -14, top: -14 },
	cropHandleBL: { left: -14, bottom: -14 },
	cropHandleBR: { right: -14, bottom: -14 },
	cropGridV1: { position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
	cropGridV2: { position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
	cropGridH1: { position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
	cropGridH2: { position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
	cropFooter: { backgroundColor: '#111', padding: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 14, flexDirection: 'row', gap: 10 },
	cropSecondaryButton: { flex: 1, minHeight: 52, borderRadius: 10, borderWidth: 1, borderColor: '#777', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
	cropSecondaryText: { color: '#FFF', fontWeight: '600', textAlign: 'center' },
	cropPrimaryButton: { flex: 1.2, minHeight: 52, borderRadius: 10, backgroundColor: COR_PRIMARIA, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 10 },
	cropPrimaryText: { color: '#FFF', fontWeight: 'bold', textAlign: 'center' },

});