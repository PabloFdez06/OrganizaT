<?php

namespace App\Services\Moodle\Parsers;

use DOMDocument;
use DOMXPath;

class AssignmentsParser
{
    /**
     * @return array<int, array<string, string|null>>
     */
    public function parse(string $html): array
    {
        $doc = new DOMDocument;
        @$doc->loadHTML($html);

        $xpath = new DOMXPath($doc);
        $rows = $xpath->query('//table[contains(@class, "generaltable")]/tbody/tr');

        if (! $rows) {
            return [];
        }

        $items = [];
        $currentSection = null;

        foreach ($rows as $row) {
            $cells = $xpath->query('./th|./td', $row);

            if (! $cells || $cells->length < 4) {
                continue;
            }

            $texts = [];
            foreach ($cells as $cell) {
                $texts[] = trim(preg_replace('/\s+/u', ' ', $cell->textContent ?? ''));
            }

            $section = $currentSection;
            $nameIndex = 0;
            $dueIndex = 1;
            $statusIndex = 2;
            $gradeIndex = 3;

            if ($cells->length >= 5) {
                $section = $texts[0] !== '' ? $texts[0] : $currentSection;
                $nameIndex = 1;
                $dueIndex = 2;
                $statusIndex = 3;
                $gradeIndex = 4;
            }

            $currentSection = $section;

            $nameCell = $cells->item($nameIndex);
            $link = null;
            $nombre = null;
            if ($nameCell) {
                $linkNode = $xpath->query('.//a[@href]', $nameCell)?->item(0);
                $link = $linkNode?->getAttribute('href');
                if ($linkNode !== null) {
                    $nombre = trim(preg_replace('/\s+/u', ' ', $linkNode->textContent ?? ''));
                }
            }
            if ($nombre === null || $nombre === '') {
                $nombre = $texts[$nameIndex] ?? null;
            }

            $feedbackParts = array_filter(
                array_map(
                    static fn (string $value): string => trim(str_ireplace('Mostrar comentario', '', $value)),
                    array_slice($texts, $gradeIndex + 1)
                ),
                static fn (string $value): bool => $value !== ''
            );

            $feedback = $feedbackParts !== [] ? implode(' | ', $feedbackParts) : null;

            $items[] = [
                'tema' => $section,
                'nombre' => $nombre,
                'fecha_entrega' => $texts[$dueIndex] ?? null,
                'estado' => $texts[$statusIndex] ?? null,
                'calificacion' => $texts[$gradeIndex] ?? null,
                'retroalimentacion' => $feedback,
                'url' => $link,
            ];
        }

        return $items;
    }
}
