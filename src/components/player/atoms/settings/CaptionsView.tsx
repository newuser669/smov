import Fuse from "fuse.js";
import { useMemo, useRef, useState } from "react";
import { useAsyncFn } from "react-use";
import { convert } from "subsrt-ts";

import { subtitleTypeList } from "@/backend/helpers/subs";
import { FlagIcon } from "@/components/FlagIcon";
import { useCaptions } from "@/components/player/hooks/useCaptions";
import { Menu } from "@/components/player/internals/ContextMenu";
import { Input } from "@/components/player/internals/ContextMenu/Input";
import { SelectableLink } from "@/components/player/internals/ContextMenu/Links";
import { getLanguageFromIETF } from "@/components/player/utils/language";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { CaptionListItem } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { useSubtitleStore } from "@/stores/subtitles";
import { sortLangCodes } from "@/utils/sortLangCodes";

export function CaptionOption(props: {
  countryCode?: string;
  children: React.ReactNode;
  selected?: boolean;
  loading?: boolean;
  onClick?: () => void;
  error?: React.ReactNode;
}) {
  return (
    <SelectableLink
      selected={props.selected}
      loading={props.loading}
      error={props.error}
      onClick={props.onClick}
    >
      <span
        data-active-link={props.selected ? true : undefined}
        className="flex items-center"
      >
        <span data-code={props.countryCode} className="mr-3">
          <FlagIcon countryCode={props.countryCode} />
        </span>
        <span>{props.children}</span>
      </span>
    </SelectableLink>
  );
}

function CustomCaptionOption() {
  const lang = usePlayerStore((s) => s.caption.selected?.language);
  const setCaption = usePlayerStore((s) => s.setCaption);
  const setCustomSubs = useSubtitleStore((s) => s.setCustomSubs);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <CaptionOption
      selected={lang === "custom"}
      onClick={() => fileInput.current?.click()}
    >
      Upload captions
      <input
        className="hidden"
        ref={fileInput}
        accept={subtitleTypeList.join(",")}
        type="file"
        onChange={(e) => {
          if (!e.target.files) return;
          const reader = new FileReader();
          reader.addEventListener("load", (event) => {
            if (!event.target || typeof event.target.result !== "string")
              return;
            const converted = convert(event.target.result, "srt");
            setCaption({
              language: "custom",
              srtData: converted,
            });
            setCustomSubs();
          });
          reader.readAsText(e.target.files[0], "utf-8");
        }}
      />
    </CaptionOption>
  );
}

function useSubtitleList(subs: CaptionListItem[], searchQuery: string) {
  return useMemo(() => {
    const input = subs.map((t) => ({
      ...t,
      languageName: getLanguageFromIETF(t.language) ?? "Unknown",
    }));
    const sorted = sortLangCodes(input.map((t) => t.language));
    let results = input.sort((a, b) => {
      return sorted.indexOf(a.language) - sorted.indexOf(b.language);
    });

    if (searchQuery.trim().length > 0) {
      const fuse = new Fuse(input, {
        includeScore: true,
        keys: ["languageName"],
      });

      results = fuse.search(searchQuery).map((res) => res.item);
    }

    return results;
  }, [subs, searchQuery]);
}

export function CaptionsView({ id }: { id: string }) {
  const router = useOverlayRouter(id);
  const lang = usePlayerStore((s) => s.caption.selected?.language);
  const [currentlyDownloading, setCurrentlyDownloading] = useState<
    string | null
  >(null);
  const { selectLanguage, disable } = useCaptions();
  const captionList = usePlayerStore((s) => s.captionList);

  const [searchQuery, setSearchQuery] = useState("");
  const subtitleList = useSubtitleList(captionList, searchQuery);

  const [downloadReq, startDownload] = useAsyncFn(
    async (language: string) => {
      setCurrentlyDownloading(language);
      return selectLanguage(language);
    },
    [selectLanguage, setCurrentlyDownloading]
  );

  const content = subtitleList.map((v) => {
    return (
      <CaptionOption
        key={v.language}
        countryCode={v.language}
        selected={lang === v.language}
        loading={v.language === currentlyDownloading && downloadReq.loading}
        error={
          v.language === currentlyDownloading && downloadReq.error
            ? downloadReq.error
            : undefined
        }
        onClick={() => startDownload(v.language)}
      >
        {v.languageName}
      </CaptionOption>
    );
  });

  return (
    <>
      <div>
        <Menu.BackLink
          onClick={() => router.navigate("/")}
          rightSide={
            <button
              type="button"
              onClick={() => router.navigate("/captions/settings")}
            >
              Customize
            </button>
          }
        >
          Captions
        </Menu.BackLink>
        <div className="mt-3">
          <Input value={searchQuery} onInput={setSearchQuery} />
        </div>
      </div>
      <Menu.ScrollToActiveSection className="!pt-1 mt-2 pb-3">
        <CaptionOption onClick={() => disable()} selected={!lang}>
          Off
        </CaptionOption>
        <CustomCaptionOption />
        {content}
      </Menu.ScrollToActiveSection>
    </>
  );
}
