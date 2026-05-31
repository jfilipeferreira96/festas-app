// lib/registry.tsx
"use client";

import React, { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";

export default function StyledComponentsRegistry({
    children,
}: {
    children: React.ReactNode;
})
{
    // Estado para armazenar a StyleSheet no servidor
    const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

    // Função para injetar os estilos no HTML
    useServerInsertedHTML(() =>
    {
        const styles = styledComponentsStyleSheet.getStyleElement();
        styledComponentsStyleSheet.instance.clearTag();
        return <>{styles}</>;
    });

    // Se estiver no servidor, usa o StyleSheetManager para recolher os estilos
    if (typeof window === "undefined")
    {
        return (
            <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
                {children}
            </StyleSheetManager>
        );
    }

    // No cliente, renderiza normalmente
    return <>{children}</>;
}
