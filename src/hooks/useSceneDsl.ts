import { useState } from 'react';
import { message } from 'antd';
import { VideoScene } from '@/types';
import { sceneToDsl, parseSceneDsl, SceneDslWarning } from '@/rendering/sceneDsl';

interface UseSceneDslProps {
  scene: VideoScene;
  onReplaceScene: (nextScene: VideoScene) => { ok: boolean; message?: string };
}

export const useSceneDsl = ({ scene, onReplaceScene }: UseSceneDslProps) => {
  const [isSceneEditorVisible, setIsSceneEditorVisible] = useState(false);
  const [sceneEditorText, setSceneEditorText] = useState('');
  const [sceneEditorBackup, setSceneEditorBackup] = useState('');
  const [autoApplySceneDsl, setAutoApplySceneDsl] = useState(false);
  const [isFormatErrorOpen, setIsFormatErrorOpen] = useState(false);
  const [formatErrorMessage, setFormatErrorMessage] = useState('');
  const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
  const [isDslWarningOpen, setIsDslWarningOpen] = useState(false);
  const [dslWarnings, setDslWarnings] = useState<SceneDslWarning[]>([]);
  const [pendingApply, setPendingApply] = useState<{ scene: VideoScene; text: string; successMessage?: string } | null>(null);
  const [closeAfterWarningApply, setCloseAfterWarningApply] = useState(false);

  const openSceneEditor = () => {
    const snapshot = sceneToDsl(scene);
    setSceneEditorText(snapshot);
    setSceneEditorBackup(snapshot);
    setIsUnsavedConfirmOpen(false);
    setIsDslWarningOpen(false);
    setDslWarnings([]);
    setPendingApply(null);
    setCloseAfterWarningApply(false);
    setIsSceneEditorVisible(true);
  };

  const hasUnsavedChanges = sceneEditorText !== sceneEditorBackup;

  const closeSceneEditor = () => {
    if (hasUnsavedChanges) {
      setIsUnsavedConfirmOpen(true);
      return;
    }
    setIsSceneEditorVisible(false);
  };

  const toggleSceneEditor = () => {
    if (!isSceneEditorVisible) {
      openSceneEditor();
      return;
    }
    closeSceneEditor();
  };

  const commitSceneEditor = (
    nextScene: VideoScene,
    sourceText: string,
    silent = false,
    successMessage?: string
  ) => {
    const result = onReplaceScene(nextScene);
    if (!result.ok) {
      if (!silent) {
        setFormatErrorMessage(result.message || '场景脚本应用失败');
        setIsFormatErrorOpen(true);
      }
      return false;
    }

    if (!silent) {
      message.success(successMessage || result.message || '场景脚本已应用');
    }
    setSceneEditorBackup(sourceText);
    return true;
  };

  const tryApplySceneEditor = (text: string, silent = false, successMessage?: string) => {
    const parsed = parseSceneDsl(text, scene);
    if (!parsed.ok) {
      if (!silent) {
        setFormatErrorMessage(`场景脚本解析失败：${parsed.error}`);
        setIsFormatErrorOpen(true);
      }
      return false;
    }

    if (!silent && parsed.warnings.length > 0) {
      setDslWarnings(parsed.warnings);
      setPendingApply({ scene: parsed.scene, text, successMessage });
      setIsDslWarningOpen(true);
      return false;
    }

    return commitSceneEditor(parsed.scene, text, silent, successMessage);
  };

  const applySceneEditor = () => {
    setCloseAfterWarningApply(false);
    tryApplySceneEditor(sceneEditorText, false, '场景脚本已应用');
  };

  const saveSceneEditor = () => {
    setCloseAfterWarningApply(false);
    tryApplySceneEditor(sceneEditorText, false, '场景脚本已保存');
  };

  const reloadDsl = () => {
    const snapshot = sceneToDsl(scene);
    setSceneEditorText(snapshot);
    setSceneEditorBackup(snapshot);
    message.info('已从当前场景重载脚本');
  };

  const rollbackDsl = () => {
    setSceneEditorText(sceneEditorBackup);
    message.info('已回退到打开编辑器时的快照');
  };

  const handleIgnoreWarning = () => {
    if (!pendingApply) return;
    const ok = commitSceneEditor(
      pendingApply.scene,
      pendingApply.text,
      false,
      pendingApply.successMessage || '场景脚本已应用（含警告）'
    );
    if (!ok) return;
    setIsDslWarningOpen(false);
    setPendingApply(null);
    setDslWarnings([]);
    if (closeAfterWarningApply) {
      setIsUnsavedConfirmOpen(false);
      setIsSceneEditorVisible(false);
      setCloseAfterWarningApply(false);
    }
  };

  const handleDiscardChanges = () => {
    setSceneEditorText(sceneEditorBackup);
    setIsUnsavedConfirmOpen(false);
    setIsSceneEditorVisible(false);
    message.info('已放弃未保存的场景脚本修改');
  };

  const handleSaveAndExit = () => {
    setCloseAfterWarningApply(true);
    const ok = tryApplySceneEditor(sceneEditorText, false, '场景脚本已保存');
    if (!ok) return;
    setIsUnsavedConfirmOpen(false);
    setIsSceneEditorVisible(false);
  };

  return {
    isSceneEditorVisible,
    sceneEditorText,
    sceneEditorBackup,
    autoApplySceneDsl,
    isFormatErrorOpen,
    formatErrorMessage,
    isUnsavedConfirmOpen,
    isDslWarningOpen,
    dslWarnings,
    setAutoApplySceneDsl,
    setIsFormatErrorOpen,
    setIsUnsavedConfirmOpen,
    setIsDslWarningOpen,
    setSceneEditorText,
    toggleSceneEditor,
    applySceneEditor,
    saveSceneEditor,
    reloadDsl,
    rollbackDsl,
    handleIgnoreWarning,
    handleDiscardChanges,
    handleSaveAndExit,
    tryApplySceneEditor,
  };
};
