export type Language = "ko" | "en" | "ja" | "zh" | "mn" | "vi" | "tl" | "ru";

export const LANGUAGES: { code: Language; name: string; flag: string }[] = [
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "mn", name: "Монгол", flag: "🇲🇳" },
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "tl", name: "Tagalog", flag: "🇵🇭" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
];

export const TRANSLATIONS = {
    ko: {
        subtitle: "내 집 현관을 눈으로 보고 쇼핑하세요",
        arBtn: "BEST AR로 우리집 꾸며보기",
        casesBtn: "시공 사례",
        quoteBtn: "내 견적 확인",
        contactBtn: "카카오톡 문의하기",
        social: {
            youtube: "유튜브",
            website: "홈페이지",
            mall: "쇼핑몰",
            insta: "인스타",
            tiktok: "틱톡",
            facebook: "페북"
        }
    },
    en: {
        subtitle: "Visualize and shop for your home entrance",
        arBtn: "Try decorating (AR)",
        casesBtn: "Portfolio",
        quoteBtn: "My Quote",
        contactBtn: "KakaoTalk Chat",
        social: {
            youtube: "YouTube",
            website: "Website",
            mall: "Store",
            insta: "Instagram",
            tiktok: "TikTok",
            facebook: "Facebook"
        }
    },
    ja: {
        subtitle: "ご自宅の玄関を見て、ショッピングをお楽しみください",
        arBtn: "ARで家の装飾を試す",
        casesBtn: "施工事例",
        quoteBtn: "見積もり確認",
        contactBtn: "カカオトーク",
        social: {
            youtube: "YouTube",
            website: "ウェブ",
            mall: "ストア",
            insta: "インスタ",
            tiktok: "TikTok",
            facebook: "FB"
        }
    },
    zh: {
        subtitle: "可视化购物，装扮您的玄关",
        arBtn: "AR 试装体验",
        casesBtn: "施工案例",
        quoteBtn: "查看报价",
        contactBtn: "KakaoTalk 咨询",
        social: {
            youtube: "油管",
            website: "官网",
            mall: "商城",
            insta: "INS",
            tiktok: "抖音",
            facebook: "脸书"
        }
    },
    mn: {
        subtitle: "Гэрийнхээ үүдний өрөөг нүдээр харж, худалдан авалт хийгээрэй",
        arBtn: "AR-аар гэрээ тохижуулах",
        casesBtn: "Хийсэн ажил",
        quoteBtn: "Үнийн санал",
        contactBtn: "KakaoTalk",
        social: {
            youtube: "YouTube",
            website: "Вэб",
            mall: "Дэлгүүр",
            insta: "Insta",
            tiktok: "TikTok",
            facebook: "FB"
        }
    },
    vi: {
        subtitle: "Hình dung và mua sắm cho lối vào nhà bạn",
        arBtn: "Thử AR Trang trí",
        casesBtn: "Dự án",
        quoteBtn: "Báo giá",
        contactBtn: "KakaoTalk Chat",
        social: {
            youtube: "YouTube",
            website: "Web",
            mall: "Cửa hàng",
            insta: "Insta",
            tiktok: "TikTok",
            facebook: "FB"
        }
    },
    tl: {
        subtitle: "I-visualize at mamili para sa entrance ng iyong bahay",
        arBtn: "Subukan ang AR",
        casesBtn: "Mga Proyekto",
        quoteBtn: "Aking Quote",
        contactBtn: "Magtanong (Kakao)",
        social: {
            youtube: "YouTube",
            website: "Web",
            mall: "Tindahan",
            insta: "Insta",
            tiktok: "TikTok",
            facebook: "FB"
        }
    },
    ru: {
        subtitle: "Визуализируйте и покупайте для прихожей",
        arBtn: "Примерить AR",
        casesBtn: "Примеры работ",
        quoteBtn: "Моя смета",
        contactBtn: "KakaoTalk",
        social: {
            youtube: "YouTube",
            website: "Сайт",
            mall: "Магазин",
            insta: "Insta",
            tiktok: "TikTok",
            facebook: "FB"
        }
    }
};
