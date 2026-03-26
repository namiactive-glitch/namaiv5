import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Copy, Sparkles, Camera, MapPin, 
  Type, Loader2, Clapperboard, RefreshCw, ArrowLeft, ExternalLink, FileText,
  Plus, Minus, Clock, ListOrdered, Image as ImageIcon, Lock, User,
  BookOpen, Layers, Split, Film, MessageSquare, Heart, Zap, Mic,
  Ghost, CookingPot, Home, Baby, School, Handshake, Utensils, Briefcase,
  GraduationCap, Smile, Shirt, List, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { withRetry } from '../services/geminiService';

interface JimengAIProps {
}

const JimengAI = ({ }: JimengAIProps) => {
  const [activeTab, setActiveTab] = useState<'series' | 'short'>(() => 
    (localStorage.getItem('jimeng_activeTab') as any) || 'series'
  );

  const extractJSON = (text: string) => {
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerE) {
          throw innerE;
        }
      }
      throw e;
    }
  };
  const [mainStory, setMainStory] = useState(() => localStorage.getItem('jimeng_mainStory') || '');
  const [fullStory, setFullStory] = useState(() => localStorage.getItem('jimeng_fullStory') || '');
  const [workflowStep, setWorkflowStep] = useState(() => {
    const saved = localStorage.getItem('jimeng_workflowStep');
    return saved ? parseInt(saved) : 0;
  });
  const [series, setSeries] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('jimeng_series');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(() => {
    const saved = localStorage.getItem('jimeng_currentIndex');
    return saved ? parseInt(saved) : 0;
  });
  const [topic, setTopic] = useState(() => localStorage.getItem('jimeng_topic') || '');
  const [genre, setGenre] = useState(() => localStorage.getItem('jimeng_genre') || 'Nhập thể loại bạn muốn');
  const [episodeCount, setEpisodeCount] = useState(() => {
    const saved = localStorage.getItem('jimeng_episodeCount');
    return saved ? parseInt(saved) : 3;
  });
  const [episodeDuration, setEpisodeDuration] = useState(() => {
    const saved = localStorage.getItem('jimeng_episodeDuration');
    return saved ? parseInt(saved) : 60;
  });
  const [seriesCharacters, setSeriesCharacters] = useState<{ name: string; gender: 'Nam' | 'Nữ'; costume: string; costumeType: 'custom' | 'reference' | 'cameo_default' }[]>(() => {
    try {
      const saved = localStorage.getItem('jimeng_seriesCharacters');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map((c: any) => ({
        ...c,
        costumeType: c.costumeType || 'custom'
      }));
    } catch (e) {
      return [];
    }
  });
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isExpandingStory, setIsExpandingStory] = useState(false);
  const [isSplittingEpisodes, setIsSplittingEpisodes] = useState(false);
  const [isSplittingScenes, setIsSplittingScenes] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [copiedIds, setCopiedIds] = useState<string[]>([]);
  const [costumeType, setCostumeType] = useState<'custom' | 'reference' | 'cameo_default'>(() => 
    (localStorage.getItem('jimeng_costumeType') as any) || 'custom'
  );
  const [costume, setCostume] = useState(() => localStorage.getItem('jimeng_costume') || 'Ví dụ: Nhân vật A mặc áo thun, Nhân vật B mặc váy...');
  
  // Short Video State
  const [shortTopic, setShortTopic] = useState(() => localStorage.getItem('jimeng_shortTopic') || '');
  const [selectedShortTheme, setSelectedShortTheme] = useState<string | null>(null);
  const [selectedShortSituation, setSelectedShortSituation] = useState<string | null>(null);
  const [customShortTheme, setCustomShortTheme] = useState('');
  const [customShortSituation, setCustomShortSituation] = useState('');
  const [shortCostumeType, setShortCostumeType] = useState<'custom' | 'reference' | 'cameo_default'>(() => 
    (localStorage.getItem('jimeng_shortCostumeType') as any) || 'custom'
  );
  const [shortCostume, setShortCostume] = useState(() => localStorage.getItem('jimeng_shortCostume') || '');
  const [shortVoiceType, setShortVoiceType] = useState<'default' | 'cameo'>(() => 
    (localStorage.getItem('jimeng_shortVoiceType') as any) || 'default'
  );
  const [shortDialogueMode, setShortDialogueMode] = useState<'with' | 'without'>(() => 
    (localStorage.getItem('jimeng_shortDialogueMode') as any) || 'without'
  );
  const [shortDuration, setShortDuration] = useState<'12s' | '24s' | '36s' | '48s'>(() => 
    (localStorage.getItem('jimeng_shortDuration') as any) || '12s'
  );
  const [shortSettings, setShortSettings] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jimeng_shortSettings');
      return saved ? JSON.parse(saved) : ['', '', '', ''];
    } catch (e) {
      return ['', '', '', ''];
    }
  });
  const [shortCharacters, setShortCharacters] = useState<{ name: string; gender: 'Nam' | 'Nữ'; costume: string; costumeType: 'custom' | 'reference' | 'cameo_default' }[]>(() => {
    try {
      const saved = localStorage.getItem('jimeng_shortCharacters');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map((c: any) => ({
        ...c,
        costumeType: c.costumeType || 'custom'
      }));
    } catch (e) {
      return [];
    }
  });
  const [isSuggestingShortTopic, setIsSuggestingShortTopic] = useState(false);
  const [isGeneratingShort, setIsGeneratingShort] = useState(false);
  const [isSyncingShort, setIsSyncingShort] = useState(false);
  const [shortResult, setShortResult] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('jimeng_shortResult');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Auto-sync refs
  const lastSyncedVi = useRef<Record<string, string>>({});
  const lastSyncedShortVi = useRef<Record<number, string>>({});
  const seriesSyncTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const shortSyncTimers = useRef<Record<number, NodeJS.Timeout>>({});

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('jimeng_activeTab', activeTab);
      localStorage.setItem('jimeng_mainStory', mainStory);
      localStorage.setItem('jimeng_fullStory', fullStory);
      localStorage.setItem('jimeng_workflowStep', workflowStep.toString());
      localStorage.setItem('jimeng_series', JSON.stringify(series));
      localStorage.setItem('jimeng_currentIndex', currentEpisodeIndex.toString());
      localStorage.setItem('jimeng_topic', topic);
      localStorage.setItem('jimeng_genre', genre);
      localStorage.setItem('jimeng_episodeCount', episodeCount.toString());
      localStorage.setItem('jimeng_episodeDuration', episodeDuration.toString());
      localStorage.setItem('jimeng_seriesCharacters', JSON.stringify(seriesCharacters));
      localStorage.setItem('jimeng_costumeType', costumeType);
      localStorage.setItem('jimeng_costume', costume);
      localStorage.setItem('jimeng_shortTopic', shortTopic);
      localStorage.setItem('jimeng_shortCostumeType', shortCostumeType);
      localStorage.setItem('jimeng_shortCostume', shortCostume);
      localStorage.setItem('jimeng_shortVoiceType', shortVoiceType);
      localStorage.setItem('jimeng_shortDialogueMode', shortDialogueMode);
      localStorage.setItem('jimeng_shortDuration', shortDuration);
      localStorage.setItem('jimeng_shortSettings', JSON.stringify(shortSettings));
      localStorage.setItem('jimeng_shortCharacters', JSON.stringify(shortCharacters));
      localStorage.setItem('jimeng_shortResult', JSON.stringify(shortResult));
    } catch (e) {
      console.warn("Error saving JimengAI state to localStorage:", e);
    }
  }, [series, currentEpisodeIndex, costumeType, costume, mainStory, fullStory, workflowStep, activeTab, shortTopic, shortResult, shortCostumeType, shortCostume, shortVoiceType, shortDialogueMode, shortDuration, shortSettings, shortCharacters, seriesCharacters]);

  const shortThemes = [
    { id: 'valentine', label: 'Lễ tình nhân', icon: Heart, color: 'text-pink-500' },
    { id: 'halloween', label: 'Halloween', icon: Ghost, color: 'text-orange-500' },
    { id: 'cooking', label: 'Nấu ăn', icon: Utensils, color: 'text-orange-600' },
    { id: 'life', label: 'Đời sống', icon: Home, color: 'text-amber-500' },
    { id: 'kids', label: 'Con cái', icon: Baby, color: 'text-orange-400' },
    { id: 'office', label: 'Công sở', icon: Briefcase, color: 'text-slate-500' },
    { id: 'school', label: 'Trường học', icon: GraduationCap, color: 'text-orange-500' },
    { id: 'friends', label: 'Bạn bè', icon: Smile, color: 'text-amber-400' },
    { id: 'custom', label: 'Khác', icon: Sparkles, color: 'text-orange-500' },
  ];

  const themeSituations: Record<string, string[]> = {
    'Lễ tình nhân': [
      'Tặng quà nhầm', 'Socola muối', 'Gấu bông khổng lồ', 'Bữa tối lãng mạn lỗi', 'Cầu hôn giả', 
      'Quà tặng vô hình', 'Bó hoa rau củ', 'Thư tình hài hước', 'Hẹn hò nhầm chỗ', 'Trang điểm lỗi',
      'Quà tặng bất ngờ', 'Bất ngờ trong bánh', 'Áo đôi kỳ quặc', 'Nến thơm mùi mắm', 'Nhẫn giả'
    ],
    'Halloween': [
      'Giả làm ma', 'Hù dọa trong bóng tối', 'Mặt nạ kinh dị', 'Tiếng động lạ', 'Bóng ma trong gương',
      'Kẹo hay bị ghẹo', 'Trang trí rùng rợn', 'Hộp quà bí ẩn', 'Tiếng cười ma quái', 'Búp bê di chuyển',
      'Ánh sáng nhấp nháy', 'Vết máu giả', 'Tiếng gõ cửa', 'Người rơm di động', 'Lời nguyền giả'
    ],
    'Nấu ăn': [
      'Gia vị nhầm lẫn', 'Món ăn siêu cay', 'Bánh kem giả', 'Nấu ăn vụng về', 'Thảm họa bếp núc',
      'Nước uống kỳ lạ', 'Trứng giả', 'Mì tôm sang chảnh', 'Rau củ biến hình', 'Bữa sáng bất ngờ',
      'Công thức lạ', 'Đồ ăn mô hình', 'Mùi vị khó quên', 'Trang trí món ăn lỗi', 'Thử thách ăn cay'
    ],
    'Đời sống': [
      'Ngủ gật', 'Làm việc nhà', 'Mua sắm online', 'Tập thể dục lỗi', 'Sửa đồ gia dụng',
      'Chuyện hàng xóm', 'Đi chợ nhầm', 'Quên chìa khóa', 'Lạc đường', 'Thời trang dạo phố',
      'Chăm sóc cây cảnh', 'Nuôi thú cưng', 'Dọn dẹp nhà cửa', 'Xem phim kinh dị', 'Chuyện đi làm'
    ],
    'Con cái': [
      'Học bài cùng con', 'Chăm con ngủ', 'Con đòi mua đồ', 'Trò chơi cùng con', 'Con làm nũng',
      'Dạy con nấu ăn', 'Con vẽ lên tường', 'Con đi học muộn', 'Con đòi đi chơi', 'Con làm vỡ đồ',
      'Con giả vờ ốm', 'Con đòi ăn kẹo', 'Con bắt chước bố mẹ', 'Con kể chuyện hài', 'Con đi lạc'
    ],
    'Công sở': [
      'Họp hành căng thẳng', 'Deadline đến nơi', 'Đồng nghiệp troll', 'Sếp khó tính', 'Giờ nghỉ trưa',
      'Máy in hỏng', 'Quên mật khẩu', 'Đi làm muộn', 'Trang phục công sở', 'Tiệc công ty',
      'Thăng tiến hụt', 'Lương về muộn', 'Gossip văn phòng', 'Team building', 'Làm thêm giờ'
    ],
    'Trường học': [
      'Kiểm tra miệng', 'Quên làm bài tập', 'Ngủ gật trong lớp', 'Trốn học đi chơi', 'Bạn cùng bàn',
      'Thầy cô vui tính', 'Giờ ra chơi', 'Thi cử áp lực', 'Đồng phục trường', 'Tình yêu tuổi học trò',
      'Họp phụ huynh', 'Lao động công ích', 'Văn nghệ trường', 'Câu lạc bộ', 'Ký túc xá'
    ],
    'Bạn bè': [
      'Hẹn hò nhóm', 'Đi du lịch chung', 'Bạn thân troll', 'Cho vay tiền', 'Đi hát karaoke',
      'Chuyện cũ nhắc lại', 'Bạn cũ gặp lại', 'Thử thách cùng bạn', 'Bạn thân người yêu', 'Tiệc sinh nhật',
      'Đi ăn vỉa hè', 'Chơi game cùng nhau', 'Tâm sự đêm khuya', 'Bạn thân khác giới', 'Hứa lèo'
    ],
    'Khác': [
      'Thể thao', 'Du lịch', 'Làm đẹp', 'Thú cưng', 'Công nghệ',
      'Nghệ thuật', 'Âm nhạc', 'Phim ảnh', 'Sách báo', 'Thời trang',
      'Xe cộ', 'Sức khỏe', 'Tâm linh', 'Khám phá', 'Tự do'
    ]
  };

  const shortSituations = [
    ...(selectedShortTheme && themeSituations[selectedShortTheme] ? themeSituations[selectedShortTheme] : ['Chăm con', 'Nấu ăn', 'Công sở', 'Trường học', 'Người yêu', 'Bạn bè', 'Vợ chồng', 'Mua sắm', 'Chơi game']),
    'Khác'
  ];

  const updateShortTopic = (theme: string | null, situation: string | null, customTheme?: string, customSituation?: string) => {
    const t = theme !== undefined ? theme : selectedShortTheme;
    const s = situation !== undefined ? situation : selectedShortSituation;
    const ct = customTheme !== undefined ? customTheme : customShortTheme;
    const cs = customSituation !== undefined ? customSituation : customShortSituation;

    let topic = "";
    if (t && t !== 'Khác') topic += t;
    else if (t === 'Khác') topic += ct;
    
    if (s && s !== 'Khác') topic += (topic ? " - " : "") + s;
    else if (s === 'Khác') topic += (topic ? " - " : "") + cs;
    
    setShortTopic(topic);
  };

  const resetShortVideoForm = () => {
    setShortCharacters([]);
    setShortSettings(['', '', '', '']);
    setShortDuration('12s');
    setShortVoiceType('default');
    setShortDialogueMode('without');
    setShortCostume('');
    setShortResult(null);
    setCustomShortSituation('');
    setCustomShortTheme('');
  };

  const genres = [
    'Hành động', 'Tình cảm', 'Kinh dị', 'Viễn tưởng', 'Hài hước', 'Cổ trang', 'Trinh thám', 'Kiếm hiệp'
  ];

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  useEffect(() => {
    const textareas = document.querySelectorAll('.auto-resize');
    textareas.forEach(textarea => {
      const el = textarea as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }, [series, currentEpisodeIndex]);

  const expandStory = async () => {
    if (!mainStory) return;
    setIsExpandingStory(true);
    try {
      const systemPrompt = `Bạn là một biên kịch phim chuyên nghiệp. 
      Nhiệm vụ của bạn là phát triển cốt truyện ngắn gọn của người dùng thành một câu chuyện đầy đủ, chi tiết và hấp dẫn hơn.
      Câu chuyện cần có cấu trúc rõ ràng, có cao trào và giải quyết vấn đề.
      Hãy viết câu chuyện dưới dạng văn bản mạch lạc, khoảng 300-500 từ.`;
      
      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: mainStory }] }],
          config: { systemInstruction: systemPrompt }
        });
        return response.text;
      });

      if (result) {
        setFullStory(result);
        setWorkflowStep(1);
      }
    } catch (error) {
      console.error("Story expansion failed:", error);
      toast.error("Lỗi phát triển cốt truyện. Vui lòng thử lại.");
    } finally {
      setIsExpandingStory(false);
    }
  };

  const suggestStory = async () => {
    if (!topic) return;
    setIsSuggesting(true);
    try {
      const systemPrompt = `Bạn là một biên kịch sáng tạo. 
      Dựa trên chủ đề, thể loại và cấu hình series người dùng cung cấp, hãy gợi ý một cốt truyện ngắn gọn (khoảng 100-200 từ) nhưng đầy đủ các yếu tố hấp dẫn, nhân vật và mâu thuẫn chính.
      Cốt truyện phải phù hợp để chia thành ${episodeCount} tập, mỗi tập khoảng ${episodeDuration} giây.
      Hãy viết bằng tiếng Việt.`;
      
      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: `Chủ đề: ${topic}\nThể loại: ${genre}\nSố tập: ${episodeCount}\nThời lượng: ${episodeDuration} giây/tập` }] }],
          config: { systemInstruction: systemPrompt }
        });
        return response.text;
      });

      if (result) {
        setMainStory(result);
      }
    } catch (error) {
      console.error("Story suggestion failed:", error);
      toast.error("Lỗi tạo cốt truyện. Vui lòng thử lại.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const syncTranslations = async (episodeIndex: number, sceneIndex: number, newViText: string) => {
    setIsSyncing(`${episodeIndex}-${sceneIndex}`);
    try {
      const systemPrompt = `Translate the following Vietnamese video prompt into English and Chinese. 
      Maintain all technical details, camera angles, and character names.
      Return only a JSON object with keys 'en' and 'zh'.`;
      
      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: newViText }] }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                en: { type: "STRING" as any },
                zh: { type: "STRING" as any }
              },
              required: ["en", "zh"]
            }
          }
        });
        return response.text;
      });

      if (result) {
        const content = extractJSON(result);
        const updatedSeries = [...series];
        if (updatedSeries[episodeIndex].scenes[sceneIndex].prompt) {
          updatedSeries[episodeIndex].scenes[sceneIndex].prompt.en = content.en;
          updatedSeries[episodeIndex].scenes[sceneIndex].prompt.zh = content.zh;
          updatedSeries[episodeIndex].scenes[sceneIndex].prompt.vi = newViText;
        }
        setSeries(updatedSeries);
      }
    } catch (error) {
      console.error("Sync translation failed:", error);
    } finally {
      setIsSyncing(null);
    }
  };

  const splitEpisodes = async () => {
    if (!fullStory) return;
    setIsSplittingEpisodes(true);
    try {
      const systemPrompt = `Bạn là một biên kịch phim chuyên nghiệp. 
      Nhiệm vụ của bạn là chia câu chuyện sau đây thành chính xác ${episodeCount} tập phim.
      Mỗi tập phim cần có tiêu đề và tóm tắt nội dung cụ thể.
      
      Yêu cầu: Trả về một JSON object chứa mảng 'episodes'. 
      Mỗi phần tử có: 
      - 'title' (Tiêu đề tập)
      - 'summary' (Tóm tắt nội dung tập khoảng 50-100 từ)
      - 'setting' (Mô tả bối cảnh chung của tập phim này, ví dụ: 'Trong một căn biệt thự cổ u ám', 'Trên đường phố Sài Gòn nhộn nhịp ban đêm').`;
      
      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: `Thể loại: ${genre}\nCâu chuyện: ${fullStory}` }] }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                episodes: {
                  type: "ARRAY" as any,
                  items: {
                    type: "OBJECT" as any,
                    properties: {
                      title: { type: "STRING" as any },
                      summary: { type: "STRING" as any },
                      setting: { type: "STRING" as any }
                    },
                    required: ["title", "summary", "setting"]
                  }
                }
              },
              required: ["episodes"]
            }
          }
        });
        return response.text;
      });

      if (result) {
        const content = extractJSON(result);
        if (content.episodes) {
          setSeries(content.episodes.map((ep: any) => ({ 
            ...ep, 
            scenes: [],
            backgroundImage: null
          })));
          setWorkflowStep(2);
          setCurrentEpisodeIndex(0);
        }
      }
    } catch (error) {
      console.error("Episode splitting failed:", error);
      toast.error("Lỗi chia tập phim. Vui lòng thử lại.");
    } finally {
      setIsSplittingEpisodes(false);
    }
  };

  const splitScenes = async (episodeIndex: number) => {
    if (!series[episodeIndex]) return;
    setIsSplittingScenes(true);
    const sceneCount = Math.ceil(episodeDuration / 12); // Each scene is 12s
    try {
      const systemPrompt = `Bạn là một đạo diễn hình ảnh chuyên nghiệp. 
      Nhiệm vụ của bạn là chia nội dung tập phim sau đây thành chính xác ${sceneCount} cảnh quay, mỗi cảnh dài khoảng 12 giây.
      
      QUY TẮC QUAN TRỌNG:
      1. Tính liên tục: Cảnh sau PHẢI nối tiếp hành động và góc quay của cảnh trước đó để tạo thành một mạch phim mượt mà.
      2. Mô tả chi tiết: Mỗi cảnh quay cần mô tả hành động, bối cảnh và cảm xúc nhân vật một cách chi tiết để có thể tạo video AI.
      3. Chuyển cảnh: Sử dụng các mô tả như 'Máy quay từ từ tiến gần', 'Chuyển sang góc nhìn của nhân vật', 'Tiếp nối hành động từ cảnh trước...' để đảm bảo tính khớp nối.
      
      Yêu cầu: Trả về một JSON object chứa mảng 'scenes'. 
      Mỗi phần tử có: 
      - 'description' (Mô tả chi tiết cảnh quay bằng tiếng Việt)
      - 'setting' (Mô tả bối cảnh cụ thể của cảnh này, kế thừa từ bối cảnh chung nhưng chi tiết hơn).
      
      Bối cảnh chung của tập này: ${series[episodeIndex].setting || 'Chưa xác định'}`;
      
      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: `Thể loại: ${genre}\nTập phim: ${series[episodeIndex].title}\nTóm tắt: ${series[episodeIndex].summary}` }] }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                scenes: {
                  type: "ARRAY" as any,
                  items: {
                    type: "OBJECT" as any,
                    properties: {
                      description: { type: "STRING" as any },
                      setting: { type: "STRING" as any }
                    },
                    required: ["description", "setting"]
                  }
                }
              },
              required: ["scenes"]
            }
          }
        });
        return response.text;
      });

      if (result) {
        const content = extractJSON(result);
        if (content.scenes) {
          const updatedSeries = [...series];
          updatedSeries[episodeIndex].scenes = content.scenes.map((s: any) => ({
            ...s,
            setting: s.setting || series[episodeIndex].setting || "",
            prompt: null
          }));
          setSeries(updatedSeries);
          setWorkflowStep(3);
        }
      }
    } catch (error) {
      console.error("Scene splitting failed:", error);
      toast.error("Lỗi chia cảnh quay. Vui lòng thử lại.");
    } finally {
      setIsSplittingScenes(false);
    }
  };

  const generateScenePrompt = async (episodeIndex: number, sceneIndex: number) => {
    if (!series[episodeIndex]?.scenes[sceneIndex]) return;
    setIsTranslating(true);
    
    try {
      const scene = series[episodeIndex].scenes[sceneIndex];
      const sceneSetting = scene.setting || series[episodeIndex].setting || "";
      const episodeBgImage = series[episodeIndex].backgroundImage;
      
      const charInfo = seriesCharacters.length > 0 
        ? `Characters involved in this series:\n${seriesCharacters.map(c => {
            let costumeDesc = "";
            if (c.costumeType === 'reference') {
              costumeDesc = "Costume: Wear the costume exactly as shown in the provided reference image. Do not describe new costumes.";
            } else if (c.costumeType === 'cameo_default') {
              costumeDesc = "Costume: Wear the default cameo costume. Do not describe new costumes.";
            } else {
              costumeDesc = `Costume: ${c.costume}`;
            }
            return `- ${c.name} (STRICT GENDER: ${c.gender === 'Nam' ? 'MALE' : 'FEMALE'}, ${costumeDesc})`;
          }).join('\n')}`
        : "";

      let costumeInstruction = "";
      if (costumeType === 'reference') {
        costumeInstruction = "IMPORTANT: The characters should wear the costumes exactly as shown in the provided reference image. Do not describe new costumes, just refer to the reference image style.";
      } else if (costumeType === 'cameo_default') {
        costumeInstruction = "IMPORTANT: The characters should wear their default cameo costumes. Do not describe new costumes.";
      } else {
        costumeInstruction = `General Costume details: ${costume}`;
      }
      
      const systemPrompt = `You are a world-class prompt engineer for Jimeng AI. 
      Create a detailed 12s cinematic video prompt for a scene based on the provided description.
      
      STRICT REQUIREMENTS:
      1. Setting & Environment: You MUST strictly incorporate this background setting: "${sceneSetting}". Ensure the environment is consistent with previous scenes.
      2. Character Consistency: You MUST strictly follow these character details to ensure consistency across the series:
      ${charInfo}
      3. Character Costume: You MUST strictly follow these costume instructions: "${costumeInstruction}".
      4. COMBINE EVERYTHING: The final prompt MUST seamlessly blend the scene action, the background environment, and the character's costume into a single, coherent cinematic description.
      5. GENDER CONSISTENCY: Ensure characters maintain consistent gender as specified (MALE/FEMALE).
      ${episodeBgImage ? "6. Background Reference: Use the provided background reference image for the environment and atmosphere." : ""}
      
      Technical Requirements:
      - Lighting: Describe cinematic lighting (e.g., volumetric lighting, golden hour, neon glow, dramatic shadows).
      - Camera: Specify camera angles and movement (e.g., low angle, dolly zoom, tracking shot, close-up, wide shot).
      - Cinematography: Use terms like 'shallow depth of field', 'anamorphic lens flares', '4k', 'highly detailed textures'.
      - Action Timeline: Break down character actions by seconds:
         - 0s-4s: [Action A]
         - 4s-8s: [Action B]
         - 8s-12s: [Action C]
      - Character Names: ALWAYS CAPITALIZE character names.
      7. DETAILED OUTPUT: Every generated prompt (vi, en, zh) MUST explicitly describe the characters (names, gender, costume) and the setting to ensure consistency across all scenes.
      
      Return only a JSON object with keys 'vi', 'en', and 'zh'.`;
      
      const userContent = `Scene Description: ${scene.description}\nBackground Setting: ${sceneSetting}\n${charInfo}\nCostume: ${costumeInstruction}`;

      const parts: any[] = [];
      if (episodeBgImage) {
        const matches = episodeBgImage.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }
      parts.push({ text: userContent });
      
      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                vi: { type: "STRING" as any },
                en: { type: "STRING" as any },
                zh: { type: "STRING" as any }
              },
              required: ["vi", "en", "zh"]
            }
          }
        });
        return response.text;
      });

      if (result) {
        const content = extractJSON(result);
        const updatedSeries = [...series];
        updatedSeries[episodeIndex].scenes[sceneIndex].prompt = content;
        setSeries(updatedSeries);
      }
    } catch (error) {
      console.error("Scene prompt generation failed:", error);
      toast.error("Lỗi tạo prompt. Vui lòng thử lại.");
    } finally {
      setIsTranslating(false);
    }
  };

  const generateSceneImage = async (episodeIndex: number, sceneIndex: number) => {
    const scene = series[episodeIndex]?.scenes[sceneIndex];
    if (!scene?.prompt?.en) return;
    
    setIsGeneratingImage(`${episodeIndex}-${sceneIndex}`);
    try {
      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                text: `Cinematic illustration for a movie scene: ${scene.prompt.en}. High quality, 4k, detailed textures.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: "16:9",
            },
          },
        });

        let imageUrl = null;
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            imageUrl = `data:image/png;base64,${base64EncodeString}`;
            break;
          }
        }
        return imageUrl;
      });

      if (result) {
        const updatedSeries = [...series];
        updatedSeries[episodeIndex].scenes[sceneIndex].imageUrl = result;
        setSeries(updatedSeries);
      }
    } catch (error) {
      console.error("Image generation failed:", error);
      toast.error("Lỗi tạo ảnh minh họa. Vui lòng thử lại.");
    } finally {
      setIsGeneratingImage(null);
    }
  };

  const suggestShortTopic = async () => {
    setIsSuggestingShortTopic(true);
    try {
      const dialogueInstruction = shortDialogueMode === 'with' 
        ? "Tình huống này CẦN có những câu thoại ngắn, hài hước và đắt giá để làm bật lên sự trớ trêu." 
        : "Tình huống này KHÔNG CÓ THOẠI, hãy tập trung hoàn toàn vào các hành động hình thể, biểu cảm khuôn mặt cực đoan và các tình tiết gây cười bằng thị giác.";

      const themeContext = selectedShortTheme ? `Chủ đề: ${selectedShortTheme}` : "Chủ đề ngẫu nhiên";
      const situationContext = selectedShortSituation ? `Tình huống cụ thể: ${selectedShortSituation}` : "";

      const systemPrompt = `Bạn là một đạo diễn phim hài tài ba, chuyên sáng tạo những tình huống "troll" cực kỳ hài hước, bất ngờ và kịch tính cho video ngắn ${shortDuration}.
      Nhiệm vụ: Gợi ý 1 tình huống troll mới lạ, độc đáo dựa trên bối cảnh được cung cấp và liệt kê các nhân vật tham gia.
      
      Yêu cầu đặc biệt:
      - ${dialogueInstruction}
      - Tình huống phải có: 1. Trò đùa tinh quái -> 2. Phản ứng bất ngờ -> 3. Kết thúc bằng màn đuổi đánh hoặc phản ứng hài hước vui nhộn.
      - ${themeContext}
      - ${situationContext}
      - Hãy viết chi tiết tình huống trong khoảng 30-50 từ.
      - Liệt kê tất cả nhân vật xuất hiện trong tình huống đó.`;
      
      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: `Hãy gợi ý một tình huống troll hài hước nhất dựa trên ${themeContext} ${situationContext} và phù hợp với chế độ ${shortDialogueMode === 'with' ? 'CÓ THOẠI' : 'KHÔNG THOẠI'} cho video ${shortDuration}.` }] }],
          config: { 
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                topic: { type: "STRING" as any, description: "Chi tiết tình huống troll hài hước" },
                characters: {
                  type: "ARRAY" as any,
                  items: {
                    type: "OBJECT" as any,
                    properties: {
                      name: { type: "STRING" as any, description: "Tên nhân vật (ví dụ: ANH CHỒNG, CHỊ VỢ, ĐỒNG NGHIỆP)" },
                      gender: { type: "STRING" as any, enum: ["Nam", "Nữ"], description: "Giới tính mặc định gợi ý" },
                      costume: { type: "STRING" as any, description: "Gợi ý trang phục phù hợp với tình huống" }
                    },
                    required: ["name", "gender", "costume"]
                  }
                }
              },
              required: ["topic", "characters"]
            }
          }
        });
        return response.text;
      });

      if (result) {
        const data = extractJSON(result);
        setShortTopic(data.topic || "");
        setShortCharacters((data.characters || []).map((c: any) => ({
          ...c,
          costumeType: 'custom'
        })));
      }
    } catch (error) {
      console.error("Short topic suggestion failed:", error);
      toast.error("Lỗi gợi ý tình huống. Vui lòng thử lại.");
    } finally {
      setIsSuggestingShortTopic(false);
    }
  };

  const generateShortPrompt = async () => {
    if (!shortTopic) return;
    setIsGeneratingShort(true);
    try {
      const charInfo = shortCharacters.length > 0 
        ? `Characters involved:\n${shortCharacters.map(c => {
            let costumeDesc = "";
            if (c.costumeType === 'reference') {
              costumeDesc = "Costume: Wear the costume exactly as shown in the provided reference image. Do not describe new costumes.";
            } else if (c.costumeType === 'cameo_default') {
              costumeDesc = "Costume: Wear the default cameo costume. Do not describe new costumes.";
            } else {
              costumeDesc = `Costume: ${c.costume}`;
            }
            return `- ${c.name} (STRICT GENDER: ${c.gender === 'Nam' ? 'MALE' : 'FEMALE'}, ${costumeDesc})`;
          }).join('\n')}`
        : "";

      let costumeInstruction = "";
      if (shortCostumeType === 'reference') {
        costumeInstruction = "IMPORTANT: The characters should wear the costumes exactly as shown in the provided reference image. Do not describe new costumes, just refer to the reference image style.";
      } else if (shortCostumeType === 'cameo_default') {
        costumeInstruction = "IMPORTANT: The characters should wear their default cameo costumes. Do not describe new costumes.";
      } else {
        costumeInstruction = `General Costume details: ${shortCostume}`;
      }
      
      const systemPrompt = `You are a world-class, talented film director specializing in viral, humorous "troll" short videos. 
      Your mission is to create detailed ${shortDuration}s cinematic video prompts that are surprising, expressive, and hilarious.
      
      Requirements:
      1. Tone: Humorous, surprising, realistic, and highly dramatic.
      2. Duration: Each segment is exactly 12 seconds.
      3. Character Consistency: You MUST strictly follow these character details to ensure consistency:
      ${charInfo}
      4. Character Costume: You MUST strictly follow these costume instructions: "${costumeInstruction}".
      5. GENDER CONSISTENCY: Ensure characters maintain consistent gender as specified (MALE/FEMALE).
      6. Content: A funny "troll" prank involving characters like spouses, colleagues, friends, or family.
         - The video MUST end with a funny, dramatic reaction or a chase scene.
      7. Expression & Body Language: Focus HEAVILY on body language, facial expressions, and physical comedy. The characters should be extremely expressive (shocked eyes, exaggerated running, funny gestures).
      8. Dialogue Mode: ${shortDialogueMode === 'with' ? 'Include short, funny, and punchy dialogue lines for the characters.' : 'NO DIALOGUE. Use only body language, facial expressions, and sound effects (gasping, laughing, footsteps) to tell the story.'}
      9. Technical Details: Include cinematic lighting, dynamic camera movements (shaky cam for the chase, close-ups for reactions), and high-quality descriptors (4k, highly detailed).
      10. Logical Continuity: If there are multiple segments, they MUST be closely linked logically. There must be a seamless transition from the setup to the reveal, and then to the consequence. Ensure perfect cause-and-effect flow.
      11. Character Names: Use descriptive names like 'ANH ĐỒNG NGHIỆP', 'CHỊ VỢ', 'ANH CHỒNG', 'BẠN THÂN', etc., based on the context.
      12. DETAILED OUTPUT: Every generated prompt (vi, en, zh) MUST explicitly describe the characters (names, gender, costume) and the setting to ensure consistency across all segments.
      
      Output Format:
      Return a JSON object with a 'segments' array. 
      - If duration is 12s, the array has 1 element.
      - If duration is 24s, the array has 2 elements (Segment 1: 12s, Segment 2: 12s).
      - If duration is 36s, the array has 3 elements (Segment 1: 12s, Segment 2: 12s, Segment 3: 12s).
      - If duration is 48s, the array has 4 elements (Segment 1: 12s, Segment 2: 12s, Segment 3: 12s, Segment 4: 12s).
      Each element must have:
      - 'vi': Vietnamese prompt
      - 'en': English prompt
      - 'zh': Chinese prompt
      
      CRITICAL: Each prompt (vi, en, zh) MUST explicitly describe the characters (names, gender, costume) and the specific background setting provided for that segment to ensure consistency across all segments.`;

      const voiceInstruction = shortVoiceType === 'cameo' ? "Voice detail: Use the original Cameo voice for the characters." : "";

      const userPrompt = `Tình huống: ${shortTopic}
      Thời lượng tổng: ${shortDuration}
      ${charInfo}
      ${shortDuration === '12s' 
        ? `Bối cảnh: ${shortSettings[0] || 'Tự chọn'}`
        : shortDuration === '24s'
        ? `Bối cảnh 1 (12s): ${shortSettings[0] || 'Tự chọn'}
           Bối cảnh 2 (12s): ${shortSettings[1] || 'Tự chọn'}`
        : shortDuration === '36s'
        ? `Bối cảnh 1 (12s): ${shortSettings[0] || 'Tự chọn'}
           Bối cảnh 2 (12s): ${shortSettings[1] || 'Tự chọn'}
           Bối cảnh 3 (12s): ${shortSettings[2] || 'Tự chọn'}`
        : `Bối cảnh 1 (12s): ${shortSettings[0] || 'Tự chọn'}
           Bối cảnh 2 (12s): ${shortSettings[1] || 'Tự chọn'}
           Bối cảnh 3 (12s): ${shortSettings[2] || 'Tự chọn'}
           Bối cảnh 4 (12s): ${shortSettings[3] || 'Tự chọn'}`
      }
      ${voiceInstruction}`;

      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                segments: {
                  type: "ARRAY" as any,
                  items: {
                    type: "OBJECT" as any,
                    properties: {
                      vi: { type: "STRING" as any },
                      en: { type: "STRING" as any },
                      zh: { type: "STRING" as any }
                    },
                    required: ["vi", "en", "zh"]
                  }
                }
              },
              required: ["segments"]
            }
          }
        });
        return response.text;
      });

      if (result) {
        const content = extractJSON(result);
        setShortResult({
          segments: content.segments,
          topic: shortTopic
        });
      }
    } catch (error) {
      console.error("Short prompt generation failed:", error);
      toast.error("Lỗi tạo prompt video ngắn. Vui lòng thử lại.");
    } finally {
      setIsGeneratingShort(false);
    }
  };

  const syncShortTranslations = async (segmentIndex: number, newViText: string) => {
    if (!shortResult) return;
    setIsSyncingShort(true);
    try {
      const systemPrompt = `Translate the following Vietnamese video prompt into English and Chinese. 
      Maintain all technical details, camera angles, and character names.
      Return only a JSON object with keys 'en' and 'zh'.`;
      
      const result = await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: newViText }] }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                en: { type: "STRING" as any },
                zh: { type: "STRING" as any }
              },
              required: ["en", "zh"]
            }
          }
        });
        return response.text;
      });

      if (result) {
        const content = extractJSON(result);
        const updatedSegments = [...shortResult.segments];
        updatedSegments[segmentIndex] = {
          ...updatedSegments[segmentIndex],
          vi: newViText,
          en: content.en,
          zh: content.zh
        };
        setShortResult(prev => ({
          ...prev,
          segments: updatedSegments
        }));
      }
    } catch (error) {
      console.error("Sync short translation failed:", error);
    } finally {
      setIsSyncingShort(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIds(prev => Array.from(new Set([...prev, id])));
      setTimeout(() => {
        setCopiedIds(prev => prev.filter(item => item !== id));
      }, 3000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedIds(prev => Array.from(new Set([...prev, id])));
      setTimeout(() => {
        setCopiedIds(prev => prev.filter(item => item !== id));
      }, 3000);
    }
  };

  const resetJimeng = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu series này không?')) {
      setSeries([]);
      setMainStory('');
      setFullStory('');
      setTopic('');
      setWorkflowStep(0);
      setCostumeType('custom');
      setCostume('Ví dụ: Nhân vật A mặc áo thun, Nhân vật B mặc váy...');
      setCurrentEpisodeIndex(0);
      localStorage.removeItem('jimeng_series');
      localStorage.removeItem('jimeng_mainStory');
      localStorage.removeItem('jimeng_fullStory');
      localStorage.removeItem('jimeng_workflowStep');
      localStorage.removeItem('jimeng_currentIndex');
      localStorage.removeItem('jimeng_costumeType');
      localStorage.removeItem('jimeng_costume');
    }
  };

  const downloadAllPrompts = () => {
    if (series.length === 0) return;
    
    let content = `SERIES: ${mainStory || 'Chưa đặt tên'}\n`;
    content += `TRANG PHỤC (${costumeType}): ${costumeType === 'custom' ? costume : (costumeType === 'reference' ? 'Ảnh tham chiếu' : 'Mặc định Cameo')}\n`;
    content += `-------------------------------------------\n\n`;
    
    series.forEach((ep, idx) => {
      content += `TẬP ${idx + 1}: ${ep.title}\n`;
      content += `TÓM TẮT: ${ep.summary}\n\n`;
      
      if (ep.scenes && ep.scenes.length > 0) {
        ep.scenes.forEach((scene, sIdx) => {
          content += `  CẢNH ${sIdx + 1}: ${scene.description}\n`;
          if (scene.prompt?.vi) {
            content += `  [VIETNAMESE PROMPT]\n  ${scene.prompt.vi}\n\n`;
            content += `  [ENGLISH PROMPT]\n  ${scene.prompt.en}\n\n`;
            content += `  [CHINESE PROMPT]\n  ${scene.prompt.zh}\n`;
          } else {
            content += `  (Chưa tạo prompt cho cảnh này)\n`;
          }
          content += `  -------------------\n`;
        });
      } else {
        content += `(Chưa chia cảnh cho tập này)\n`;
      }
      content += `-------------------------------------------\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jimeng_AI_Series_${mainStory.substring(0, 20).replace(/\s+/g, '_') || 'Export'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentEpisode = series[currentEpisodeIndex] || null;

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="flex justify-center">
        <div className="bg-orange-50 p-2 rounded-[2rem] flex gap-2 shadow-inner border border-orange-100">
          <button
            onClick={() => setActiveTab('series')}
            className={`px-8 py-3 rounded-[1.5rem] text-sm transition-all flex items-center gap-2.5 ${
              activeTab === 'series' 
                ? 'bg-white text-orange-600 shadow-lg shadow-orange-100 scale-105' 
                : 'text-orange-400 hover:text-orange-600 hover:bg-white/50'
            }`}
          >
            <Film size={20} />
            PHIM BỘ (SERIES)
          </button>
          <button
            onClick={() => setActiveTab('short')}
            className={`px-8 py-3 rounded-[1.5rem] text-sm transition-all flex items-center gap-2.5 ${
              activeTab === 'short' 
                ? 'bg-white text-orange-600 shadow-lg shadow-orange-100 scale-105' 
                : 'text-orange-400 hover:text-orange-600 hover:bg-white/50'
            }`}
          >
            <Zap size={20} />
            VIDEO NGẮN (TROLL)
          </button>
        </div>
      </div>

      {activeTab === 'series' ? (
        <>
          {series.length > 0 && (
        <div className="flex justify-end">
          <button 
            onClick={downloadAllPrompts}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm shadow-md"
            title="Tải xuống toàn bộ kịch bản"
          >
            <FileText size={20} />
            <span>Tải kịch bản</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-orange-50 border border-orange-100 space-y-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-slate-700 px-2">
                  <Sparkles size={18} className="text-orange-500" /> Chủ đề phim 🎬
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Nhập chủ đề (VD: Tình yêu học đường...)"
                    className="flex-1 p-4 bg-orange-50/50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-slate-700 px-2">
                  <Clapperboard size={18} className="text-orange-500" /> Thể loại phim ✨
                </label>
                <div className="flex flex-wrap gap-2">
                  {genres.map(g => {
                    const isSelected = genre.split(', ').includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => {
                          const currentGenres = genre.split(', ').filter(x => x && x !== 'Nhập thể loại bạn muốn');
                          if (isSelected) {
                            const newGenres = currentGenres.filter(x => x !== g);
                            setGenre(newGenres.length > 0 ? newGenres.join(', ') : 'Nhập thể loại bạn muốn');
                          } else {
                            const newGenres = [...currentGenres, g];
                            setGenre(newGenres.join(', '));
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-[11px] transition-all border-2 ${
                          isSelected 
                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100 scale-105' 
                            : 'bg-white text-slate-500 border-slate-100 hover:border-orange-200 hover:bg-orange-50'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
                <input 
                  type="text"
                  value={genre === 'Nhập thể loại bạn muốn' ? '' : genre}
                  onChange={(e) => setGenre(e.target.value || 'Nhập thể loại bạn muốn')}
                  placeholder="Nhập thể loại khác..."
                  className="w-full p-4 bg-orange-50/50 border-2 border-orange-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-slate-700 px-2">
                  <Layers size={18} className="text-orange-500" /> Cấu hình Series ⚙️
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-orange-50/50 p-4 rounded-[2rem] border-2 border-orange-100 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
                      <ListOrdered size={14} /> Số tập
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-2xl border border-orange-100 p-1.5 shadow-sm">
                      <button 
                        onClick={() => setEpisodeCount(Math.max(1, episodeCount - 1))}
                        className="p-2.5 hover:bg-orange-50 rounded-xl text-orange-500 transition-all"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-sm text-slate-700">{episodeCount}</span>
                      <button 
                        onClick={() => setEpisodeCount(Math.min(10, episodeCount + 1))}
                        className="p-2.5 hover:bg-orange-50 rounded-xl text-orange-500 transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-orange-50/50 p-4 rounded-[2rem] border-2 border-orange-100 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
                      <Clock size={14} /> Giây/Tập
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-2xl border border-orange-100 p-1.5 shadow-sm">
                      <button 
                        onClick={() => setEpisodeDuration(Math.max(12, episodeDuration - 12))}
                        className="p-2.5 hover:bg-orange-50 rounded-xl text-orange-500 transition-all"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-sm text-slate-700">{episodeDuration}s</span>
                      <button 
                        onClick={() => setEpisodeDuration(Math.min(600, episodeDuration + 12))}
                        className="p-2.5 hover:bg-orange-50 rounded-xl text-orange-500 transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={suggestStory}
                  disabled={isSuggesting || !topic}
                  className="w-full py-5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 text-white rounded-[2rem] transition-all flex items-center justify-center gap-3 text-sm shadow-xl shadow-orange-200 disabled:shadow-none"
                >
                  {isSuggesting ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  <span>TẠO CỐT TRUYỆN ✨</span>
                </button>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-slate-700 px-2">
                  <BookOpen size={18} className="text-orange-500" /> Cốt truyện ban đầu 📖
                </label>
                <textarea 
                  value={mainStory}
                  onChange={(e) => setMainStory(e.target.value)}
                  placeholder="Nhập ý tưởng hoặc cốt truyện ngắn gọn của bạn..."
                  className="w-full p-6 bg-orange-50/50 border-2 border-orange-100 rounded-[2.5rem] focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-none transition-all text-sm min-h-[120px] resize-none font-medium leading-relaxed"
                />
                <button
                  onClick={expandStory}
                  disabled={isExpandingStory || !mainStory}
                  className="w-full py-5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white rounded-[2rem] transition-all flex items-center justify-center gap-3 text-sm shadow-xl shadow-amber-200 disabled:shadow-none"
                >
                  {isExpandingStory ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  <span>PHÁT TRIỂN CỐT TRUYỆN 🚀</span>
                </button>
              </div>

              {workflowStep >= 1 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 pt-4 border-t border-slate-100"
                >
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <Film size={16} className="text-violet-500" /> Cốt truyện chi tiết (Có thể sửa)
                  </label>
                  <textarea 
                    value={fullStory}
                    onChange={(e) => {
                      setFullStory(e.target.value);
                      autoResize(e);
                    }}
                    className="w-full p-4 bg-violet-50 border border-violet-100 rounded-2xl text-xs text-slate-600 leading-relaxed min-h-[150px] focus:ring-2 focus:ring-violet-500 outline-none transition-all custom-scrollbar italic resize-none"
                  />
                  <button
                    onClick={splitEpisodes}
                    disabled={isSplittingEpisodes}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-100 disabled:shadow-none"
                  >
                    {isSplittingEpisodes ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />}
                    <span>Chia tập phim</span>
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {workflowStep >= 2 && series.length > 0 && (
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs text-slate-400 uppercase tracking-widest">Danh sách {series.length} tập</h3>
                <button onClick={resetJimeng} className="text-slate-400 hover:text-red-500 transition-all">
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {series.map((ep, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentEpisodeIndex(idx)}
                    className={`w-full text-left p-3 rounded-2xl transition-all border ${
                      currentEpisodeIndex === idx 
                        ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200' 
                        : 'bg-slate-50 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${
                        currentEpisodeIndex === idx ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs truncate ${currentEpisodeIndex === idx ? 'text-violet-700' : 'text-slate-700'}`}>
                          {ep.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{ep.summary}</p>
                      </div>
                      {ep.scenes?.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {currentEpisode ? (
              <motion.div
                key={currentEpisodeIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 md:p-10 rounded-[3.5rem] shadow-xl shadow-orange-50 border border-orange-100">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs uppercase tracking-widest shadow-lg shadow-orange-100">Tập {currentEpisodeIndex + 1} 🎬</span>
                        <input 
                          type="text"
                          value={currentEpisode.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSeries(prev => {
                              const updated = [...prev];
                              updated[currentEpisodeIndex].title = val;
                              return updated;
                            });
                          }}
                          className="text-3xl text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full placeholder:text-slate-300"
                          placeholder="Tiêu đề tập phim..."
                        />
                      </div>
                      <textarea 
                        value={currentEpisode.summary}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSeries(prev => {
                            const updated = [...prev];
                            updated[currentEpisodeIndex].summary = val;
                            return updated;
                          });
                          autoResize(e);
                        }}
                        placeholder="Tóm tắt nội dung tập phim này..."
                        className="text-base text-slate-500 leading-relaxed bg-transparent border-none focus:ring-0 p-0 w-full resize-none auto-resize overflow-hidden font-medium italic"
                      />
                    </div>
                    <button
                      onClick={() => splitScenes(currentEpisodeIndex)}
                      disabled={isSplittingScenes}
                      className="w-full md:w-auto px-8 py-4 bg-orange-600 text-white text-sm rounded-[2rem] hover:bg-orange-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-200 disabled:shadow-none disabled:bg-slate-200 group"
                    >
                      {isSplittingScenes ? <Loader2 size={20} className="animate-spin" /> : <Split size={20} className="group-hover:rotate-180 transition-transform duration-500" />}
                      CHIA CẢNH (12s) ✨
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
                        <label className="text-[10px] text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                          <Shirt size={14} className="text-orange-500" /> Trang phục nhân vật
                        </label>
                        <div className="flex bg-orange-50 p-1.5 rounded-2xl gap-1 border border-orange-100">
                          <button 
                            onClick={() => setCostumeType('custom')}
                            className={`px-4 py-2 rounded-xl text-[10px] transition-all flex items-center gap-2 ${
                              costumeType === 'custom' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500 hover:text-orange-400'
                            }`}
                          >
                            <User size={14} /> Tùy chọn
                          </button>
                          <button 
                            onClick={() => setCostumeType('reference')}
                            className={`px-4 py-2 rounded-xl text-[10px] transition-all flex items-center gap-2 ${
                              costumeType === 'reference' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500 hover:text-orange-400'
                            }`}
                          >
                            <ImageIcon size={14} /> Ảnh mẫu
                          </button>
                          <button 
                            onClick={() => setCostumeType('cameo_default')}
                            className={`px-4 py-2 rounded-xl text-[10px] transition-all flex items-center gap-2 ${
                              costumeType === 'cameo_default' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500 hover:text-orange-400'
                            }`}
                          >
                            <Lock size={14} /> Cameo
                          </button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {costumeType === 'custom' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                          >
                            <input 
                              type="text"
                              value={costume}
                              onChange={(e) => setCostume(e.target.value)}
                              placeholder="Ví dụ: ANH CHỒNG mặc áo thun trắng, CHỊ VỢ mặc váy hoa..."
                              className="w-full p-5 bg-orange-50/30 border-2 border-orange-100 rounded-[2rem] text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-slate-300"
                            />
                          </motion.div>
                        )}
                        {costumeType === 'reference' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-5 bg-orange-50 border-2 border-orange-100 rounded-[2rem] flex items-center gap-4 group cursor-pointer hover:bg-orange-100/50 transition-colors"
                          >
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm group-hover:scale-110 transition-transform">
                              <ImageIcon size={24} />
                            </div>
                            <div>
                              <p className="text-sm text-orange-700">Ảnh trang phục tham chiếu 📸</p>
                              <p className="text-[11px] text-orange-500">AI sẽ tự phân tích trang phục từ ảnh Jimeng.</p>
                            </div>
                          </motion.div>
                        )}
                        {costumeType === 'cameo_default' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] flex items-center gap-4"
                          >
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                              <Lock size={24} />
                            </div>
                            <div>
                              <p className="text-sm text-slate-700">Đã khóa trang phục Cameo 🔒</p>
                              <p className="text-[11px] text-slate-400">Sử dụng trang phục gốc để đảm bảo nhất quán.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <label className="text-[10px] text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                          <MapPin size={14} className="text-orange-500" /> Bối cảnh & Không gian
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer p-2 bg-orange-50 hover:bg-orange-100 rounded-xl text-orange-500 transition-all border border-orange-100 shadow-sm" title="Tải ảnh bối cảnh tham chiếu">
                            <Camera size={16} />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setSeries(prev => {
                                      const updated = [...prev];
                                      updated[currentEpisodeIndex].backgroundImage = reader.result as string;
                                      return updated;
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {currentEpisode.backgroundImage && (
                            <button 
                              onClick={() => {
                                setSeries(prev => {
                                  const updated = [...prev];
                                  updated[currentEpisodeIndex].backgroundImage = null;
                                  return updated;
                                });
                              }}
                              className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all border border-red-100 shadow-sm"
                              title="Xóa ảnh bối cảnh"
                            >
                              <Minus size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="relative group">
                        <textarea 
                          value={currentEpisode.setting}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSeries(prev => {
                              const updated = [...prev];
                              updated[currentEpisodeIndex].setting = val;
                              return updated;
                            });
                          }}
                          placeholder="Mô tả bối cảnh chung của tập phim này..."
                          className="w-full p-5 bg-orange-50/30 border-2 border-orange-100 rounded-[2rem] text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all min-h-[52px] resize-none placeholder:text-slate-300"
                        />
                        {currentEpisode.backgroundImage && (
                          <div className="absolute right-3 bottom-3 w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-lg ring-1 ring-orange-100">
                            <img src={currentEpisode.backgroundImage} className="w-full h-full object-cover" alt="BG Ref" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {currentEpisode.scenes?.length > 0 ? (
                    <div className="space-y-8">
                      <h4 className="text-[10px] text-slate-400 uppercase tracking-[0.4em] px-4 flex items-center gap-2">
                        <List size={14} className="text-orange-500" /> Danh sách cảnh quay 🎬
                      </h4>
                      <div className="grid grid-cols-1 gap-6">
                        {currentEpisode.scenes.map((scene: any, sIdx: number) => (
                          <div key={sIdx} className="bg-orange-50/30 border-2 border-orange-100 rounded-[2.5rem] p-8 space-y-6 hover:shadow-lg hover:shadow-orange-50 transition-all group">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs shadow-md">
                                  {sIdx + 1}
                                </span>
                                <span className="text-[10px] text-orange-600 uppercase tracking-widest">Cảnh {sIdx + 1} (12s) ⏱️</span>
                              </div>
                              <button
                                onClick={() => generateScenePrompt(currentEpisodeIndex, sIdx)}
                                disabled={isTranslating}
                                className="px-5 py-2.5 bg-orange-600 text-white text-[10px] rounded-xl hover:bg-orange-700 transition-all flex items-center gap-2 shadow-lg shadow-orange-100 disabled:bg-slate-200 disabled:shadow-none"
                              >
                                {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                TẠO PROMPT ✨
                              </button>
                            </div>
                            <textarea 
                              value={scene.description}
                              onChange={(e) => {
                                const updatedSeries = [...series];
                                updatedSeries[currentEpisodeIndex].scenes[sIdx].description = e.target.value;
                                setSeries(updatedSeries);
                                autoResize(e);
                              }}
                              placeholder="Mô tả hành động trong cảnh này..."
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-base text-slate-700 leading-relaxed italic resize-none overflow-hidden placeholder:text-slate-300"
                              rows={1}
                              onFocus={autoResize}
                            />

                            <div className="bg-white/80 rounded-2xl p-4 border-2 border-orange-100 flex items-start gap-4 shadow-sm">
                              <MapPin size={18} className="text-orange-400 mt-1 shrink-0" />
                              <textarea 
                                value={scene.setting}
                                onChange={(e) => {
                                  const updatedSeries = [...series];
                                  updatedSeries[currentEpisodeIndex].scenes[sIdx].setting = e.target.value;
                                  setSeries(updatedSeries);
                                  autoResize(e);
                                }}
                                placeholder="Bối cảnh & Không gian riêng cho cảnh này..."
                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-slate-500 font-medium leading-relaxed resize-none overflow-hidden placeholder:text-slate-300"
                                rows={1}
                                onFocus={autoResize}
                              />
                            </div>
                            
                            {scene.imageUrl && (
                              <div className="relative group rounded-3xl overflow-hidden border-4 border-white shadow-xl aspect-video bg-slate-100 ring-1 ring-orange-100">
                                <img 
                                  src={scene.imageUrl} 
                                  alt={`Scene ${sIdx + 1}`} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-orange-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                  <button 
                                    onClick={() => generateSceneImage(currentEpisodeIndex, sIdx)}
                                    className="bg-white text-orange-600 px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-2xl hover:scale-105 transition-transform"
                                  >
                                    <RefreshCw size={16} className={isGeneratingImage === `${currentEpisodeIndex}-${sIdx}` ? 'animate-spin' : ''} />
                                    LÀM MỚI ẢNH 📸
                                  </button>
                                </div>
                              </div>
                            )}

                            {scene.prompt && (
                              <div className="bg-slate-900 rounded-[2rem] p-6 space-y-6 border-4 border-slate-800 shadow-2xl">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center px-2">
                                    <span className="text-[9px] text-orange-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> Vietnamese (Editable)
                                    </span>
                                    <div className="flex items-center gap-3">
                                      {isSyncing === `${currentEpisodeIndex}-${sIdx}` && <Loader2 size={12} className="animate-spin text-orange-400" />}
                                      <button 
                                        onClick={() => syncTranslations(currentEpisodeIndex, sIdx, scene.prompt.vi)}
                                        disabled={!!isSyncing}
                                        className="p-2 text-slate-500 hover:text-orange-400 transition-all hover:bg-slate-800 rounded-lg"
                                        title="Đồng bộ sang EN/ZH"
                                      >
                                        <RefreshCw size={14} />
                                      </button>
                                      <button onClick={() => copyToClipboard(scene.prompt.vi, `vi-${sIdx}`)} className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${copiedIds.includes(`vi-${sIdx}`) ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                                        {copiedIds.includes(`vi-${sIdx}`) ? <><span className="text-[9px]">ĐÃ CHÉP</span><Check size={14} /></> : <Copy size={14} />}
                                      </button>
                                    </div>
                                  </div>
                                    <textarea 
                                      value={scene.prompt.vi}
                                      onChange={(e) => {
                                        const text = e.target.value;
                                        const updatedSeries = [...series];
                                        updatedSeries[currentEpisodeIndex].scenes[sIdx].prompt.vi = text;
                                        setSeries(updatedSeries);
                                        
                                        // Auto-sync
                                        const key = `${currentEpisodeIndex}-${sIdx}`;
                                        if (seriesSyncTimers.current[key]) clearTimeout(seriesSyncTimers.current[key]);
                                        seriesSyncTimers.current[key] = setTimeout(() => {
                                          if (lastSyncedVi.current[key] !== text) {
                                            syncTranslations(currentEpisodeIndex, sIdx, text);
                                            lastSyncedVi.current[key] = text;
                                          }
                                        }, 2000);
                                      }}
                                      className="w-full bg-slate-800/50 border-2 border-slate-700 rounded-2xl p-4 text-xs text-slate-300 font-medium leading-relaxed focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none resize-none min-h-[100px] transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800">
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                      <span className="text-[9px] text-blue-400 uppercase tracking-widest">English 🇺🇸</span>
                                      <div className="flex items-center gap-2">
                                        {!scene.imageUrl && (
                                          <button 
                                            onClick={() => generateSceneImage(currentEpisodeIndex, sIdx)}
                                            disabled={!!isGeneratingImage}
                                            className="p-1.5 text-orange-500 hover:text-orange-400 transition-all hover:bg-slate-800 rounded-lg"
                                            title="Tạo ảnh minh họa"
                                          >
                                            {isGeneratingImage === `${currentEpisodeIndex}-${sIdx}` ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                                          </button>
                                        )}
                                        <button onClick={() => copyToClipboard(scene.prompt.en, `en-${sIdx}`)} className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${copiedIds.includes(`en-${sIdx}`) ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                                          {copiedIds.includes(`en-${sIdx}`) ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-3 italic">{scene.prompt.en}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                      <span className="text-[9px] text-red-400 uppercase tracking-widest">Chinese 🇨🇳</span>
                                      <button onClick={() => copyToClipboard(scene.prompt.zh, `zh-${sIdx}`)} className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${copiedIds.includes(`zh-${sIdx}`) ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                                        {copiedIds.includes(`zh-${sIdx}`) ? <Check size={12} /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-3 italic">{scene.prompt.zh}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-96 border-4 border-dashed border-orange-100 rounded-[4rem] flex flex-col items-center justify-center text-slate-400 gap-8 bg-orange-50/20 transition-all hover:bg-orange-50/40 group">
                      <div className="bg-white p-8 rounded-full shadow-xl border border-orange-100 group-hover:scale-110 transition-transform duration-500">
                        <Camera size={64} className="text-orange-300" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-lg text-slate-600">Sẵn sàng chia cảnh 🎬</p>
                        <p className="text-sm text-slate-400 font-medium">Bấm nút "CHIA CẢNH (12s)" phía trên để bắt đầu ✨</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 space-y-8 bg-orange-50/10 rounded-[4rem] border-4 border-dashed border-orange-100 transition-all hover:bg-orange-50/20 group">
                <div className="bg-white p-8 rounded-full shadow-xl border border-orange-50 group-hover:rotate-12 transition-transform duration-500">
                  <Film size={48} className="text-orange-200" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg text-slate-600">Chưa có kịch bản chi tiết 📝</p>
                  <p className="text-sm text-slate-400 font-medium">Vui lòng phát triển cốt truyện và chia tập ở cột bên trái ✨</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-orange-50 border border-orange-100 space-y-8">
            <div className="text-center space-y-3">
              <motion.div 
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-flex p-4 bg-orange-100 rounded-3xl text-orange-600 mb-2"
              >
                <Ghost size={40} />
              </motion.div>
              <h2 className="text-2xl text-slate-800 tracking-tight">Tạo Video Troll Hài Hước 🎭</h2>
              <p className="text-slate-500 text-xs max-w-md mx-auto font-medium">Sáng tạo những khoảnh khắc bất ngờ, kịch tính và đầy tiếng cười cho Jimeng AI.</p>
            </div>

            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-5">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">CHỦ ĐỀ TROLL</label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {shortThemes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          if (selectedShortTheme !== t.label) {
                            resetShortVideoForm();
                            setSelectedShortTheme(t.label);
                            setSelectedShortSituation(null); // Clear situation when theme changes
                            updateShortTopic(t.label, null);
                          }
                        }}
                        className={`p-3 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${
                          selectedShortTheme === t.label
                            ? 'bg-orange-50 border-orange-500 shadow-lg shadow-orange-100'
                            : 'bg-white border-slate-100 hover:border-orange-200 hover:bg-orange-50/30'
                        }`}
                      >
                        <t.icon size={20} className={selectedShortTheme === t.label ? 'text-orange-600' : t.color} />
                        <span className={`text-[10px] tracking-tight ${selectedShortTheme === t.label ? 'text-orange-700' : 'text-slate-500'}`}>
                          {t.label}
                        </span>
                        {selectedShortTheme === t.label && (
                          <motion.div layoutId="activeTheme" className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500" />
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedShortTheme === 'Khác' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                      <input 
                        type="text"
                        value={customShortTheme}
                        onChange={(e) => {
                          setCustomShortTheme(e.target.value);
                          updateShortTopic('Khác', selectedShortSituation, e.target.value);
                        }}
                        placeholder="Nhập chủ đề troll khác..."
                        className="w-full p-4 bg-orange-50/30 border-2 border-orange-100 rounded-2xl text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest">TÌNH HUỐNG HÀI HƯỚC</label>
                    </div>

                  </div>
                  <div className="flex flex-wrap gap-2">
                    {shortSituations.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSelectedShortSituation(s);
                          updateShortTopic(selectedShortTheme, s);
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] transition-all border-2 ${
                          selectedShortSituation === s
                            ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-100 scale-105'
                            : 'bg-white text-slate-500 border-slate-100 hover:border-orange-200 hover:bg-orange-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {selectedShortSituation === 'Khác' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                      <input 
                        type="text"
                        value={customShortSituation}
                        onChange={(e) => {
                          setCustomShortSituation(e.target.value);
                          updateShortTopic(selectedShortTheme, 'Khác', customShortTheme, e.target.value);
                        }}
                        placeholder="Nhập tình huống khác..."
                        className="w-full p-4 bg-orange-50/30 border-2 border-orange-100 rounded-2xl text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-slate-700 px-2">
                  <FileText size={16} className="text-orange-500" /> CHI TIẾT TÌNH HUỐNG (TÙY CHỈNH THÊM) 📝
                </label>
                <div className="relative">
                  <textarea
                    value={shortTopic}
                    onChange={(e) => setShortTopic(e.target.value)}
                    placeholder="Ví dụ: Đồng nghiệp troll nhau bằng cách dán giấy 'Tôi là đồ ngốc' sau lưng, hoặc Chồng troll vợ bằng cách giả vờ làm hỏng túi xách..."
                    className="w-full p-6 bg-orange-50/20 border-2 border-orange-100 rounded-[2.5rem] text-slate-700 focus:ring-8 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all min-h-[140px] resize-none text-lg leading-relaxed placeholder:text-slate-300 shadow-inner"
                  />
                </div>
                <button
                  onClick={suggestShortTopic}
                  disabled={isSuggestingShortTopic}
                  className="text-orange-600 hover:text-orange-700 text-[10px] flex items-center gap-1.5 transition-all bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100"
                >
                  {isSuggestingShortTopic ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Gợi ý ý tưởng ✨
                </button>
              </div>

              {shortCharacters.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 bg-white p-8 rounded-[3rem] border-2 border-orange-100 shadow-xl shadow-orange-50"
                >
                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-orange-100 rounded-xl flex items-center justify-center">
                        <User size={14} className="text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-[11px] text-slate-700 uppercase tracking-widest">NHÂN VẬT TRONG TÌNH HUỐNG 🎭</h3>
                        <p className="text-[8px] text-slate-400 italic">Đang có {shortCharacters.length} nhân vật tham gia</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShortCharacters([...shortCharacters, { name: `NHÂN VẬT ${shortCharacters.length + 1}`, gender: 'Nam', costume: '', costumeType: 'custom' }])}
                        className="p-1.5 bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-all shadow-lg shadow-orange-200 hover:scale-110"
                        title="Thêm nhân vật"
                      >
                        <Plus size={12} />
                      </button>
                      <button 
                        onClick={() => setShortCharacters([])}
                        className="p-1.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm hover:scale-110"
                        title="Xóa tất cả"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {/* Header - Hidden on Mobile */}
                    <div className="hidden md:grid md:grid-cols-[1.5fr,1fr,1.5fr,2fr,40px] gap-4 px-4 text-slate-400">
                      <div className="text-[9px] uppercase tracking-widest text-center md:text-left">Tên nhân vật</div>
                      <div className="text-[9px] uppercase tracking-widest text-center md:text-left">Giới tính</div>
                      <div className="text-[9px] uppercase tracking-widest text-center md:text-left">Cấu hình trang phục</div>
                      <div className="text-[9px] uppercase tracking-widest text-center md:text-left">Chi tiết trang phục</div>
                      <div></div>
                    </div>

                    {/* Character List */}
                    <div className="space-y-3">
                      {shortCharacters.map((char, idx) => (
                        <div 
                          key={idx} 
                          className="group bg-orange-50/30 hover:bg-orange-50 transition-all rounded-2xl p-4 md:p-3 md:grid md:grid-cols-[1.5fr,1fr,1.5fr,2fr,40px] md:gap-4 md:items-start border-2 border-transparent hover:border-orange-100"
                        >
                          {/* Tên nhân vật */}
                          <div className="space-y-1.5 md:space-y-0">
                            <label className="md:hidden text-[9px] text-slate-400 uppercase tracking-widest">Tên nhân vật</label>
                            <textarea 
                              rows={1}
                              value={char.name}
                              onInput={(e) => {
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                              }}
                              onChange={(e) => {
                                const newChars = [...shortCharacters];
                                newChars[idx].name = e.target.value;
                                setShortCharacters(newChars);
                              }}
                              placeholder="Tên..."
                              className="w-full bg-white border-2 border-orange-100 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all resize-none overflow-hidden min-h-[32px]"
                            />
                          </div>

                          {/* Giới tính */}
                          <div className="space-y-1.5 md:space-y-0 mt-3 md:mt-0">
                            <label className="md:hidden text-[9px] text-slate-400 uppercase tracking-widest">Giới tính</label>
                            <div className="flex gap-1.5">
                              {['Nam', 'Nữ'].map((g) => (
                                <button
                                  key={g}
                                  onClick={() => {
                                    const newChars = [...shortCharacters];
                                    newChars[idx].gender = g as 'Nam' | 'Nữ';
                                    setShortCharacters(newChars);
                                  }}
                                  className={`flex-1 md:flex-none px-2.5 py-1.5 rounded-lg text-[9px] transition-all ${
                                    char.gender === g 
                                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' 
                                      : 'bg-white text-slate-400 border-2 border-orange-50 hover:border-orange-200'
                                  }`}
                                >
                                  {g === 'Nam' ? '👦 ' : '👧 '} {g}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Cấu hình trang phục */}
                          <div className="space-y-1.5 md:space-y-0 mt-3 md:mt-0">
                            <label className="md:hidden text-[9px] text-slate-400 uppercase tracking-widest">Cấu hình trang phục</label>
                            <div className="flex flex-wrap bg-white p-0.5 rounded-lg gap-1 border-2 border-orange-50">
                              <button 
                                onClick={() => {
                                  const newChars = [...shortCharacters];
                                  newChars[idx].costumeType = 'custom';
                                  setShortCharacters(newChars);
                                }}
                                className={`flex-1 px-2 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                                  char.costumeType === 'custom' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-orange-400'
                                }`}
                              >
                                <Sparkles size={8} />
                                <span className="text-[8px] whitespace-nowrap">Tùy chọn</span>
                              </button>
                              <button 
                                onClick={() => {
                                  const newChars = [...shortCharacters];
                                  newChars[idx].costumeType = 'reference';
                                  setShortCharacters(newChars);
                                }}
                                className={`flex-1 px-2 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                                  char.costumeType === 'reference' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-orange-400'
                                }`}
                              >
                                <ImageIcon size={8} />
                                <span className="text-[8px] whitespace-nowrap">Ảnh tham chiếu</span>
                              </button>
                              <button 
                                onClick={() => {
                                  const newChars = [...shortCharacters];
                                  newChars[idx].costumeType = 'cameo_default';
                                  setShortCharacters(newChars);
                                }}
                                className={`flex-1 px-2 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                                  char.costumeType === 'cameo_default' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-orange-400'
                                }`}
                              >
                                <Lock size={8} />
                                <span className="text-[8px] whitespace-nowrap">Cameo</span>
                              </button>
                            </div>
                          </div>

                          {/* Chi tiết trang phục */}
                          <div className="space-y-1.5 md:space-y-0 mt-3 md:mt-0">
                            <label className="md:hidden text-[9px] text-slate-400 uppercase tracking-widest">Chi tiết trang phục</label>
                            <textarea 
                              rows={1}
                              onInput={(e) => {
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                              }}
                              value={char.costume}
                              onChange={(e) => {
                                const newChars = [...shortCharacters];
                                newChars[idx].costume = e.target.value;
                                setShortCharacters(newChars);
                              }}
                              disabled={char.costumeType !== 'custom'}
                              placeholder={char.costumeType === 'custom' ? "Trang phục..." : "Theo cấu hình..."}
                              className={`w-full bg-white border-2 border-orange-100 rounded-lg px-3 py-1.5 text-xs focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all resize-none overflow-hidden min-h-[32px] ${
                                char.costumeType !== 'custom' ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            />
                          </div>

                          {/* Action */}
                          <div className="flex justify-end mt-3 md:mt-0">
                            <button 
                              onClick={() => {
                                const newChars = shortCharacters.filter((_, i) => i !== idx);
                                setShortCharacters(newChars);
                              }}
                              className="w-8 h-8 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm hover:scale-110"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div className={`grid grid-cols-1 ${shortDuration === '12s' ? '' : 'md:grid-cols-2'} gap-8`}>
                {Array.from({ length: shortDuration === '12s' ? 1 : shortDuration === '24s' ? 2 : shortDuration === '36s' ? 3 : 4 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700 px-2">
                      <Camera size={18} className="text-orange-500" /> Bối cảnh Video {i + 1} 🎬
                    </label>
                    <input 
                      type="text"
                      value={shortSettings[i]}
                      onChange={(e) => {
                        const newSettings = [...shortSettings];
                        newSettings[i] = e.target.value;
                        setShortSettings(newSettings);
                      }}
                      placeholder={`Ví dụ: Bối cảnh đoạn ${i + 1}...`}
                      className="w-full p-5 bg-orange-50/30 border-2 border-orange-100 rounded-[2rem] text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 px-2">
                    <Clock size={16} className="text-orange-500" /> Thời lượng Video ⏱️
                  </label>
                  <div className="flex bg-orange-50 p-1.5 rounded-[1.5rem] gap-1.5 border-2 border-orange-100 shadow-sm">
                    {['12s', '24s', '36s', '48s'].map((dur) => (
                      <button 
                        key={dur}
                        onClick={() => setShortDuration(dur as any)}
                        className={`flex-1 py-2.5 rounded-[1rem] text-[10px] transition-all flex items-center justify-center gap-1.5 ${
                          shortDuration === dur ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105' : 'text-slate-500 hover:text-orange-400'
                        }`}
                      >
                        {dur === '12s' ? <Clock size={14} /> : <Zap size={14} />} {dur}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 px-2">
                    <Mic size={16} className="text-orange-500" /> Giọng đọc & Thoại 🎙️
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex bg-orange-50 p-1.5 rounded-[1.5rem] gap-1.5 border-2 border-orange-100 shadow-sm">
                        <button 
                          onClick={() => setShortVoiceType('default')}
                          className={`flex-1 py-2.5 rounded-[1rem] text-[10px] transition-all flex items-center justify-center gap-1.5 ${
                            shortVoiceType === 'default' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105' : 'text-slate-500 hover:text-orange-400'
                          }`}
                        >
                          <Mic size={14} /> Mặc định
                        </button>
                        <button 
                          onClick={() => setShortVoiceType('cameo')}
                          className={`flex-1 py-2.5 rounded-[1rem] text-[10px] transition-all flex items-center justify-center gap-1.5 ${
                            shortVoiceType === 'cameo' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105' : 'text-slate-500 hover:text-orange-400'
                          }`}
                        >
                          <User size={14} /> Cameo
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 px-4 italic">
                        {shortVoiceType === 'cameo' ? "✨ Dùng giọng gốc của nhân vật Cameo." : "🤖 Dùng giọng AI tiêu chuẩn."}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex bg-orange-50 p-1.5 rounded-[1.5rem] gap-1.5 border-2 border-orange-100 shadow-sm">
                        <button 
                          onClick={() => setShortDialogueMode('with')}
                          className={`flex-1 py-2.5 rounded-[1rem] text-[10px] transition-all flex items-center justify-center gap-1.5 ${
                            shortDialogueMode === 'with' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105' : 'text-slate-500 hover:text-orange-400'
                          }`}
                        >
                          <MessageSquare size={14} /> Có thoại
                        </button>
                        <button 
                          onClick={() => setShortDialogueMode('without')}
                          className={`flex-1 py-2.5 rounded-[1rem] text-[10px] transition-all flex items-center justify-center gap-1.5 ${
                            shortDialogueMode === 'without' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105' : 'text-slate-500 hover:text-orange-400'
                          }`}
                        >
                          <Layers size={14} /> Không thoại
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 px-4 italic">
                        {shortDialogueMode === 'with' ? "💬 Có lời thoại hài hước & phụ đề." : "🎭 Dùng ngôn ngữ hình thể & biểu cảm."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={generateShortPrompt}
                disabled={isGeneratingShort || !shortTopic}
                className="w-full py-5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white rounded-[2rem] transition-all flex items-center justify-center gap-3 text-sm shadow-xl shadow-violet-200 disabled:shadow-none"
              >
                {isGeneratingShort ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                <span>TẠO PROMPT VIDEO {shortDuration.toUpperCase()}</span>
              </button>
            </div>
          </div>

          {shortResult && shortResult.segments && (
            <div className="space-y-8">
              {shortResult.segments.map((segment: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900 rounded-[3rem] p-8 space-y-8 border border-slate-800 shadow-2xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 text-base">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-white text-base uppercase tracking-wider">Video {idx + 1} (12s)</h3>
                        {shortDuration === '24s' && (
                          <p className="text-slate-500 text-[9px] italic">
                            {idx === 0 ? "Phần 1: Khởi đầu & Phản ứng" : "Phần 2: Cao trào & Kết thúc"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-emerald-500 uppercase tracking-widest">Vietnamese Prompt (Editable)</span>
                          {isSyncingShort && <Loader2 size={12} className="animate-spin text-emerald-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => syncShortTranslations(idx, segment.vi)}
                            disabled={!!isSyncingShort}
                            className="p-2 text-slate-500 hover:text-emerald-400 transition-all"
                            title="Đồng bộ sang EN/ZH"
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button 
                            onClick={() => copyToClipboard(segment.vi, `short-vi-${idx}`)} 
                            className={`p-2 rounded-xl transition-all flex items-center gap-2 ${copiedIds.includes(`short-vi-${idx}`) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                          >
                            {copiedIds.includes(`short-vi-${idx}`) ? <><span className="text-[10px]">ĐÃ SAO CHÉP</span><Copy size={16} /></> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                      <textarea 
                        value={segment.vi}
                        onChange={(e) => {
                          const text = e.target.value;
                          const updatedSegments = [...shortResult.segments];
                          updatedSegments[idx] = { ...updatedSegments[idx], vi: text };
                          setShortResult(prev => ({
                            ...prev,
                            segments: updatedSegments
                          }));
                          autoResize(e);

                          // Auto-sync
                          if (shortSyncTimers.current[idx]) clearTimeout(shortSyncTimers.current[idx]);
                          shortSyncTimers.current[idx] = setTimeout(() => {
                            if (lastSyncedShortVi.current[idx] !== text) {
                              syncShortTranslations(idx, text);
                              lastSyncedShortVi.current[idx] = text;
                            }
                          }, 2000);
                        }}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed italic focus:ring-1 focus:ring-emerald-500 outline-none auto-resize min-h-[100px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-violet-400 uppercase tracking-widest">English Prompt (For Jimeng)</span>
                          <button 
                            onClick={() => copyToClipboard(segment.en, `short-en-${idx}`)} 
                            className={`p-2 rounded-xl transition-all flex items-center gap-2 ${copiedIds.includes(`short-en-${idx}`) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                          >
                            {copiedIds.includes(`short-en-${idx}`) ? <><span className="text-[10px]">ĐÃ SAO CHÉP</span><Copy size={14} /></> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 text-[11px] text-slate-400 leading-relaxed min-h-[100px]">
                          {segment.en}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-amber-400 uppercase tracking-widest">Chinese Prompt</span>
                          <button 
                            onClick={() => copyToClipboard(segment.zh, `short-zh-${idx}`)} 
                            className={`p-2 rounded-xl transition-all flex items-center gap-2 ${copiedIds.includes(`short-zh-${idx}`) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                          >
                            {copiedIds.includes(`short-zh-${idx}`) ? <><span className="text-[10px]">ĐÃ SAO CHÉP</span><Copy size={14} /></> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 text-[11px] text-slate-400 leading-relaxed min-h-[100px]">
                          {segment.zh}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default JimengAI;
