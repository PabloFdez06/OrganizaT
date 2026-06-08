<?php

namespace App\Services\Moodle\Parsers;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

class ResourcesParser
{
    /**
     * @return array<int, array<string, string|null>>
     */
    public function parse(string $html): array
    {
        if (trim($html) === '') {
            return [];
        }

        $doc = new DOMDocument;
        @$doc->loadHTML($html);

        $xpath = new DOMXPath($doc);
        $activities = $xpath->query('//*[contains(concat(" ", normalize-space(@class), " "), " activity ")]');

        if (! $activities || $activities->length === 0) {
            return [];
        }

        $resources = [];

        foreach ($activities as $activity) {
            if (! $activity instanceof DOMNode) {
                continue;
            }

            $moduleType = $this->extractModuleType($activity);

            if ($moduleType === null) {
                continue;
            }

            if (! in_array($moduleType, ['resource', 'url', 'folder', 'page', 'book', 'label', 'h5pactivity', 'scorm', 'imscp', 'lti'], true)) {
                continue;
            }

            $name = $this->extractResourceName($xpath, $activity);

            if ($name === '') {
                continue;
            }

            $url = $this->extractResourceUrl($xpath, $activity);
            $unit = $this->extractUnitName($xpath, $activity);
            $size = $this->extractSizeLabel($xpath, $activity);

            $resources[] = [
                'unidad' => $unit !== '' ? $unit : 'General',
                'nombre' => $name,
                'modulo' => $moduleType,
                'tipo' => null,
                'tipo_label' => null,
                'bucket' => null,
                'tamano' => $size !== '' ? $size : null,
                'extension' => $this->extractExtension($name, $url),
                'url' => $url !== '' ? $url : null,
                'contenedor' => null,
            ];
        }

        return $resources;
    }

    /**
     * @return array<int, array<string, string|null>>
     */
    public function parseModuleIndex(string $html, string $moduleType): array
    {
        if (trim($html) === '') {
            return [];
        }

        $doc = new DOMDocument;
        @$doc->loadHTML($html);

        $xpath = new DOMXPath($doc);
        $rows = $xpath->query('//table[contains(@class, "generaltable")]/tbody/tr');

        if (! $rows || $rows->length === 0) {
            return [];
        }

        $resources = [];
        $currentSection = 'General';

        foreach ($rows as $row) {
            if (! $row instanceof DOMElement) {
                continue;
            }

            $cells = $xpath->query('./th|./td', $row);

            if (! $cells || $cells->length === 0) {
                continue;
            }

            $texts = [];
            foreach ($cells as $cell) {
                $texts[] = $this->normalizeText((string) ($cell->textContent ?? ''));
            }

            $allLinks = $xpath->query('.//a[@href]', $row);
            $firstLink = $allLinks?->item(0);

            if (! $firstLink instanceof DOMElement) {
                $sectionCandidate = $texts[0] ?? '';
                if ($sectionCandidate !== '') {
                    $currentSection = $sectionCandidate;
                }

                continue;
            }

            $name = $this->normalizeText((string) $firstLink->textContent);

            if ($name === '') {
                $name = $texts[1] ?? ($texts[0] ?? '');
            }

            if ($name === '') {
                continue;
            }

            $sectionName = $this->extractSectionFromIndexRow($texts, $name, $currentSection);
            if ($sectionName !== '') {
                $currentSection = $sectionName;
            }

            $size = '';
            foreach ($texts as $text) {
                if (preg_match('/(\d+[\d.,]*)\s*(KB|MB|GB|B)\b/i', $text, $matches) === 1) {
                    $size = trim((string) $matches[1]).' '.mb_strtoupper((string) $matches[2]);
                    break;
                }
            }

            $moduleTypeSafe = mb_strtolower(trim($moduleType));
            $url = $this->extractPreferredIndexUrl($allLinks, $texts, $moduleTypeSafe);

            $resources[] = [
                'unidad' => $sectionName !== '' ? $sectionName : $currentSection,
                'nombre' => $name,
                'modulo' => $moduleTypeSafe !== '' ? $moduleTypeSafe : 'resource',
                'tipo' => null,
                'tipo_label' => null,
                'bucket' => null,
                'tamano' => $size !== '' ? $size : null,
                'extension' => $this->extractExtension($name, $url),
                'url' => $url !== '' ? $url : null,
                'contenedor' => null,
            ];
        }

        return $resources;
    }

    /**
     * @param  array<int, string>  $texts
     */
    private function extractSectionFromIndexRow(array $texts, string $name, string $fallback): string
    {
        if ($texts === []) {
            return $fallback;
        }

        $first = trim((string) ($texts[0] ?? ''));

        if ($first !== '' && mb_strtolower($first) !== mb_strtolower($name)) {
            return $first;
        }

        return $fallback;
    }

    /**
     * @param  \DOMNodeList<DOMElement>|null  $links
     * @param  array<int, string>  $texts
     */
    private function extractPreferredIndexUrl(?\DOMNodeList $links, array $texts, string $moduleType): string
    {
        $hrefs = [];

        if ($links instanceof \DOMNodeList) {
            foreach ($links as $link) {
                if (! $link instanceof DOMElement) {
                    continue;
                }

                $href = trim((string) $link->getAttribute('href'));

                if ($href !== '') {
                    $hrefs[] = $href;
                }
            }
        }

        if ($moduleType === 'url') {
            foreach ($hrefs as $href) {
                if (! str_contains($href, '/mod/url/view.php') && preg_match('/^https?:\/\//i', $href) === 1) {
                    return $href;
                }
            }

            foreach ($texts as $text) {
                if (preg_match('/https?:\/\/[^\s]+/i', $text, $matches) === 1) {
                    return (string) $matches[0];
                }
            }
        }

        foreach ($hrefs as $href) {
            if (str_contains($href, '/pluginfile.php') || str_contains($href, '/webservice/pluginfile.php')) {
                return $href;
            }
        }

        return $hrefs[0] ?? '';
    }

    private function extractModuleType(DOMNode $activity): ?string
    {
        if (! $activity instanceof DOMElement) {
            return null;
        }

        $className = (string) $activity->getAttribute('class');

        if ($className === '') {
            return null;
        }

        if (preg_match('/\bmodtype_([a-z0-9_]+)\b/i', $className, $matches) === 1) {
            return mb_strtolower((string) ($matches[1] ?? ''));
        }

        if (preg_match('/\bmodtype\s+([a-z0-9_]+)\b/i', $className, $matches) === 1) {
            return mb_strtolower((string) ($matches[1] ?? ''));
        }

        return null;
    }

    private function extractResourceName(DOMXPath $xpath, DOMNode $activity): string
    {
        $nameNode = $xpath->query('.//*[contains(concat(" ", normalize-space(@class), " "), " instancename ")][1]', $activity)?->item(0);

        if ($nameNode instanceof DOMNode) {
            $name = $this->normalizeText($nameNode->textContent ?? '');

            if ($name !== '') {
                return $name;
            }
        }

        $linkNode = $xpath->query('.//a[@href][1]', $activity)?->item(0);

        if ($linkNode instanceof DOMNode) {
            $name = $this->normalizeText($linkNode->textContent ?? '');

            if ($name !== '') {
                return $name;
            }
        }

        return '';
    }

    private function extractResourceUrl(DOMXPath $xpath, DOMNode $activity): string
    {
        $linkNode = $xpath->query('.//a[@href][1]', $activity)?->item(0);

        if (! $linkNode instanceof DOMElement) {
            return '';
        }

        return trim((string) $linkNode->getAttribute('href'));
    }

    private function extractUnitName(DOMXPath $xpath, DOMNode $activity): string
    {
        $subsection = $this->extractSubsectionName($xpath, $activity);

        $section = $xpath->query('ancestor::*[contains(@id, "section-") or contains(concat(" ", normalize-space(@class), " "), " section ") or contains(concat(" ", normalize-space(@class), " "), " course-section ")][1]', $activity)?->item(0);

        if (! $section instanceof DOMNode) {
            return $subsection;
        }

        $titleNode = $xpath->query('.//*[contains(concat(" ", normalize-space(@class), " "), " sectionname ") or contains(concat(" ", normalize-space(@class), " "), " section-title ")][1]', $section)?->item(0);

        if (! $titleNode instanceof DOMNode) {
            $titleNode = $xpath->query('.//h2[1] | .//h3[1]', $section)?->item(0);
        }

        if (! $titleNode instanceof DOMNode) {
            return $subsection;
        }

        $sectionName = $this->normalizeText($titleNode->textContent ?? '');

        if ($sectionName === '') {
            return $subsection;
        }

        if ($subsection === '' || mb_strtolower($subsection) === mb_strtolower($sectionName)) {
            return $sectionName;
        }

        return $sectionName.' - '.$subsection;
    }

    private function extractSubsectionName(DOMXPath $xpath, DOMNode $activity): string
    {
        $subsectionLabel = $xpath->query('./preceding-sibling::*[contains(concat(" ", normalize-space(@class), " "), " activity ") and contains(concat(" ", normalize-space(@class), " "), " label ")][1]', $activity)?->item(0);

        if (! $subsectionLabel instanceof DOMNode) {
            return '';
        }

        $titleNode = $xpath->query('.//*[contains(concat(" ", normalize-space(@class), " "), " instancename ")][1]', $subsectionLabel)?->item(0);

        if (! $titleNode instanceof DOMNode) {
            $titleNode = $xpath->query('.//h3[1] | .//h4[1] | .//strong[1]', $subsectionLabel)?->item(0);
        }

        if (! $titleNode instanceof DOMNode) {
            return '';
        }

        return $this->normalizeText($titleNode->textContent ?? '');
    }

    private function extractSizeLabel(DOMXPath $xpath, DOMNode $activity): string
    {
        $detailsNode = $xpath->query('.//*[contains(concat(" ", normalize-space(@class), " "), " resourcelinkdetails ")][1]', $activity)?->item(0);

        if (! $detailsNode instanceof DOMNode) {
            return '';
        }

        $rawDetails = $this->normalizeText($detailsNode->textContent ?? '');

        if ($rawDetails === '') {
            return '';
        }

        if (preg_match('/(\d+[\d.,]*)\s*(KB|MB|GB|B)\b/i', $rawDetails, $matches) === 1) {
            return trim((string) $matches[1]).' '.mb_strtoupper((string) $matches[2]);
        }

        return '';
    }

    private function extractExtension(string $name, string $url): ?string
    {
        $fromName = pathinfo($name, PATHINFO_EXTENSION);

        if (is_string($fromName) && $fromName !== '') {
            return mb_strtolower($fromName);
        }

        $path = parse_url($url, PHP_URL_PATH);

        if (! is_string($path) || $path === '') {
            return null;
        }

        $fromPath = pathinfo($path, PATHINFO_EXTENSION);

        return is_string($fromPath) && $fromPath !== '' ? mb_strtolower($fromPath) : null;
    }

    private function normalizeText(string $value): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $value));
    }
}
