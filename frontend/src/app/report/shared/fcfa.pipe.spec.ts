import { FcfaPipe, formatFcfa } from './fcfa.pipe';

describe('FcfaPipe', () => {
    const nnbsp = ' ';

    it('formats thousands with a narrow no-break space and the F unit', () => {
        expect(formatFcfa(100300)).toBe(`100${nnbsp}300${nnbsp}F`);
        expect(formatFcfa(17649200)).toBe(`17${nnbsp}649${nnbsp}200${nnbsp}F`);
        expect(formatFcfa(0)).toBe(`0${nnbsp}F`);
    });

    it('rounds, handles null and uses a true minus sign', () => {
        expect(formatFcfa(null)).toBe(`0${nnbsp}F`);
        expect(formatFcfa('1500.6')).toBe(`1${nnbsp}501${nnbsp}F`);
        expect(formatFcfa(-6450)).toBe(`−6${nnbsp}450${nnbsp}F`);
    });

    it('supports signed and bare modes', () => {
        const pipe = new FcfaPipe();
        expect(pipe.transform(9400, 'signed')).toBe(`+9${nnbsp}400${nnbsp}F`);
        expect(pipe.transform(0, 'signed')).toBe(`0${nnbsp}F`);
        expect(pipe.transform(26450, 'bare')).toBe(`26${nnbsp}450`);
    });
});
