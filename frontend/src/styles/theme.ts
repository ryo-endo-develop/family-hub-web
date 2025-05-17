import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// 基本テーマの作成
const baseTheme = createTheme({
  palette: {
    primary: {
      light: '#7986cb',
      main: '#3f51b5',
      dark: '#303f9f',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ff4081',
      main: '#f50057',
      dark: '#c51162',
      contrastText: '#fff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    // グローバルなMUIコンポーネントのスタイル設定
    MuiCssBaseline: {
      styleOverrides: {
        // スクロールバーのカスタマイズ
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '*::-webkit-scrollbar-thumb': {
          background: '#c1c1c1',
          borderRadius: '4px',
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: '#a8a8a8',
        },
        // モバイルでのタップハイライトを無効化
        '*': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        // スムーズスクロールを全体に適用
        'html': {
          scrollBehavior: 'smooth',
        },
        // モバイルデバイスでの選択レイヤーのカスタマイズ
        '@media (max-width: 600px)': {
          '*': {
            // モバイルでの長押し時のコンテキストメニューを調整
            '-webkit-touch-callout': 'none',
          },
          'input, textarea': {
            fontSize: '16px', // モバイルでのフォーム入力時のズームを防止
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          // モバイル向けに調整
          '@media (max-width: 600px)': {
            padding: '10px 16px', // モバイルでタッチしやすいように少し大きく
          },
        },
        // 新しいスタイル：フロートアクションボタン
        containedSizeLarge: {
          padding: '12px 24px',
        },
      },
      defaultProps: {
        disableElevation: true, // フラットデザイン向け
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden', // カードコンテンツがはみ出さないように
          '@media (max-width: 600px)': {
            borderRadius: 8, // モバイルでは少し小さく
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
          '@media (max-width: 600px)': {
            '& .MuiInputBase-input': {
              padding: '14px 12px', // モバイルでタッチしやすいように調整
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '12px 8px', // モバイルでは余白を少し小さく
          },
        },
        head: {
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          '@media (max-width: 600px)': {
            height: 28, // モバイルでは少し小さく
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            paddingTop: 12,
            paddingBottom: 12, // モバイルでタッチしやすいように調整
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          '@media (max-width: 600px)': {
            margin: 16,
            width: 'calc(100% - 32px)',
            maxWidth: '100%',
          },
        },
      },
    },
    // テーブルのレスポンシブ対応の強化
    MuiTable: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            tableLayout: 'fixed', // モバイルでの表示を改善
          },
        },
      },
    },
    // タブレット・モバイル向けのFAB調整
    MuiFab: {
      styleOverrides: {
        root: {
          '@media (max-width: 900px)': {
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1050,
          },
        },
      },
    },
  },
  // ブレイクポイントのカスタマイズ（必要に応じて）
  breakpoints: {
    values: {
      xs: 0,     // モバイル
      sm: 600,   // タブレット（縦向き）
      md: 900,   // タブレット（横向き）
      lg: 1200,  // デスクトップ
      xl: 1536,  // ワイドスクリーン
    },
  },
});

// レスポンシブフォントサイズを適用
export const theme = responsiveFontSizes(baseTheme);
