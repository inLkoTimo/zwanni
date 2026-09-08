"use client";

import { useState } from "react";

import { itemEmoji, type CategoryItem } from "@/lib/game/categories";

/** Zeigt das Bild einer Karte, falls eine `image`-URL hinterlegt
 *  ist - sonst (und bei kaputtem Link) das Emoji. */
export function ItemVisual({
  categoryId,
  item,
  size = 96,
  emojiClassName = "text-6xl leading-none",
}: {
  categoryId: string;
  item: CategoryItem;
  size?: number;
  emojiClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (item.image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image}
        alt={item.name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="rounded-xl object-cover mx-auto shadow-lg"
        style={{ width: size, height: size }}
      />
    );
  }

  return <p className={emojiClassName}>{itemEmoji(categoryId, item)}</p>;
}
