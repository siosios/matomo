<?php

/**
 * Matomo - free/libre analytics platform
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

declare(strict_types=1);

namespace Piwik\API;

class APIVersion
{
    /**
     * @var int
     */
    private $majorVersion;

    /**
     * @var ?int
     */
    private $minorVersion;

    /**
     * @var ?int
     */
    private $patchVersion;

    public function __construct(int $majorVersion, ?int $minorVersion, ?int $patchVersion)
    {
        $this->majorVersion = $majorVersion;
        $this->minorVersion = $minorVersion;
        $this->patchVersion = $patchVersion;
    }

    public static function createFromVersionString(string $versionString): APIVersion
    {
        return new self(...self::extractVersions($versionString));
    }

    public function getMajorVersion(): int
    {
        return $this->majorVersion;
    }

    public function getMinorVersion(): int
    {
        return $this->minorVersion;
    }

    public function getPatchVersion(): ?int
    {
        return $this->patchVersion;
    }

    public function getClassString(string $className): string
    {
        $plugin = Request::getPluginNameFromClassName($className);
        $version = strval($this->majorVersion);
        if (null !== $this->minorVersion) {
            $version .= '_' . strval($this->minorVersion);
            if (null !== $this->patchVersion) {
                $version .= '_' . strval($this->patchVersion);
            }
        }
        return sprintf('\Piwik\Plugins\%s\API\%s\API', $plugin, $version);
    }

    public static function extractVersions(string $versionString): array
    {
        // Validate input: must be 1 to 3 dot-separated numbers
        if (!preg_match('/^\d+(\.\d+){0,2}$/', $versionString)) {
            throw new InvalidArgumentException("Invalid version string: $versionString");
        }

        // Split into parts
        $parts = explode('.', $versionString);

        // Assign major, minor, patch with null defaults
        $majorVersion = isset($parts[0]) ? (int) $parts[0] : null;
        $minorVersion = isset($parts[1]) ? (int) $parts[1] : null;
        $patchVersion = isset($parts[2]) ? (int) $parts[2] : null;

        return [$majorVersion, $minorVersion, $patchVersion];
    }

}