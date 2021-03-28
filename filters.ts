import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { SlpTransactionDetails } from 'slpjs';
import { TokenCacheItem } from './interfaces';

class _TokenFilterRule {
    name!: string;
    type!: string;
    info!: string;
    tokenId?: string;
    tokenType?: number;
    tokenSymbol?: string;
    tokenName?: string;
    nftParentId?: string;

    static fromObject(object: any) {
        const rule = Object.assign(new _TokenFilterRule(), object);
        if (!rule.tokenId) rule.tokenId = rule.info;
        if (!rule.tokenSymbol) rule.tokenSymbol = rule.name;
        return rule;
    }

    key() {
        return JSON.stringify(this);
    }

    checkConditions(tokenDetails: TokenCacheItem) {
        if (this.tokenId && this.tokenId !== tokenDetails.tokenIdHex) {
            if (this.nftParentId && tokenDetails.symbol === "WAIFU")
                console.trace(1, tokenDetails, this);
            return false;
        }

        if (this.tokenType && this.tokenType !== tokenDetails.versionType) {
            if (this.nftParentId && tokenDetails.symbol === "WAIFU")
                console.trace(2, tokenDetails, this);
            return false;
        }

        if (this.tokenSymbol && this.tokenSymbol !== tokenDetails.symbol) {
            if (this.nftParentId && tokenDetails.symbol === "WAIFU")
                console.trace(3, tokenDetails, this);
            return false;
        }

        if (this.tokenType && this.tokenType !== tokenDetails.versionType) {
            if (this.nftParentId && tokenDetails.symbol === "WAIFU")
                console.trace(4, tokenDetails, this);
            return false;
        }

        if (this.nftParentId && this.nftParentId !== tokenDetails.nftParentId) {
            if (this.nftParentId && tokenDetails.symbol === "WAIFU")
                console.trace(5, tokenDetails, this);
            return false;
        }

        return true;
    };

    include(tokenDetails: TokenCacheItem) {
        if(this.type === 'include-single') {
            return this.checkConditions(tokenDetails);
        } else if(this.type === 'exclude-single') {
            return !this.checkConditions(tokenDetails);
        }
    }

    exclude(tokenDetails: TokenCacheItem) {
        return !this.include(tokenDetails);
    }
}

class _TokenFilter {
    public static Instance() {
        return this._instance || (this._instance = new _TokenFilter());
    }
    private static _instance: _TokenFilter;
    _rules = new Map<string, _TokenFilterRule>();
    _hasIncludeSingle = false;
    _hasExcludeSingle = false;

    constructor() {
        try {
            let o = yaml.safeLoad(fs.readFileSync('filters.yml', 'utf-8')) as { tokens: _TokenFilterRule[] };
            o!.tokens.forEach((f: any) => {
                const rule = _TokenFilterRule.fromObject(f);
                this.addRule(rule);
                console.log("[INFO] Loaded token filter:", rule.name, rule.key());
            });
        } catch(e) {
            console.log("[INFO] No token filters loaded.", e);
        }
    }

    addRule(rule: _TokenFilterRule) {
        if(this._rules.has(rule.key()))
            return;
        if(rule.type === 'include-single') {
            if(this._hasExcludeSingle)
                throw Error('Invalid combination of filter rules.  Filter already has exclude single rules added.');
            this._hasIncludeSingle = true;
        } else if(rule.type === 'exclude-single') {
            if(this._hasIncludeSingle)
                throw Error('Invalid combination of filter rules.  Filter already has include single rules added.');
            this._hasIncludeSingle = true;
        }
        this._rules.set(rule.key(), rule);
    }

    passesAllFilterRules(tokenDetails: TokenCacheItem) {
        if(this._hasIncludeSingle) {
            let r = Array.from(this._rules).filter((v, i) => v[1].type === 'include-single');
            for(let i = 0; i < r.length; i++) {
                if(r[i][1].type === 'include-single' && r[i][1].include(tokenDetails)) {
                    return true;
                }
            }

            return false;
        } else if(this._hasExcludeSingle) {
            let r = Array.from(this._rules).filter((v, i) => v[1].type === 'exclude-single');
            for(let i = 0; i < r.length; i++) {
                if(r[i][1].type === 'exclude-single' && r[i][1].exclude(tokenDetails)) {
                    return false;
                }
            }
            return true;
        } else {
            return true;
        }
    }
}

// accessor to a singleton stack for filters
export const TokenFilters = _TokenFilter.Instance;

TokenFilters();